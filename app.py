from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from types import SimpleNamespace
import openai
import os
import uuid
import logging
import traceback
from datetime import datetime
from openai import OpenAI, AuthenticationError, OpenAIError

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'url'
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

client = OpenAI(api_key='')

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    stories = db.relationship('Story', backref='author', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)  

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)  

class Story(db.Model):
    __tablename__ = 'stories'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    genre = db.Column(db.String(50), nullable=False)
    plot = db.Column(db.Text, nullable=False)
    writing_style = db.Column(db.String(50))
    chapter_count = db.Column(db.Integer, default=1)
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

def generate_story(data):
    try:
        if not data.get('genre') or not data.get('plot'):
            logger.error("Missing required fields: 'genre' or 'plot'")
            return None, "Gerekli alanlar eksik: 'Tür' veya 'Konu'"

        prompt = (
            f"Aşağıdaki parametrelere göre TÜRKÇE bir hikaye yaz:\n"
            f"Tür: {data['genre']}\n"
            f"Konu: {data['plot']}\n"
        )
        if data.get('writing_style'):
            prompt += f"Yazım Tarzı: {data['writing_style']}\n"
        prompt += (
            f"\nHikaye toplam {max(1, min(int(data.get('chapter_count', 1)), 5))} bölümden oluşmalı. "
            f"Her bölüm en az 400 kelime olmalı. "
            f"Her bölümün başında 'Bölüm X' başlığı olmalı. "
            f"Karakterler ve olaylar detaylıca işlenmeli. "
            f"Hikaye bütünlüğü ve akıcılığına dikkat et. "
            f"Sadece hikaye metnini üret. "
            f"TÜM HİKAYE TÜRKÇE OLMALI."
        )

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Sen yaratıcı bir hikaye anlatıcısısın. Kullanıcıdan gelen parametrelere göre, sadece TÜRKÇE ve bölümlere ayrılmış, her bölümü yaklaşık 500-600 kelime olan, akıcı ve detaylı bir hikaye yaz."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )

        story_content = response.choices[0].message.content.strip()
        return story_content, None

    except AuthenticationError:
        logger.error("OpenAI API authentication failed.")
        return None, "OpenAI API kimlik doğrulaması başarısız."
    except OpenAIError as e:
        logger.error("OpenAI API error: %s", str(e))
        traceback.print_exc()
        return None, f"OpenAI API hatası: {str(e)}"
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        traceback.print_exc()
        return None, f"Hikaye oluşturulurken hata oluştu: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/story', methods=['GET', 'POST'])
def story():
    if request.method == 'POST':
        data = {
            'genre': request.form.get('genre'),
            'plot': request.form.get('plot'),
            'writing_style': request.form.get('writing_style'),
            'chapter_count': max(1, min(int(request.form.get('chapter_count', 1)), 5))
        }

        if not data['genre'] or not data['plot']:
            flash('Hikaye türü ve konusu boş bırakılamaz.', 'error')
            return render_template('story.html', story=None, is_authenticated='user_id' in session)

        story_content, error = generate_story(data)
        if error:
            flash(f'Could not generate story: {error}', 'error')
            return render_template('story.html', story=None, is_authenticated='user_id' in session)

        story_obj = {
            'content': story_content,
            'genre': data['genre'],
            'plot': data['plot'],
            'writing_style': data['writing_style'],
            'chapter_count': data['chapter_count']
        }

        if 'user_id' in session:
            return render_template(
                'story.html',
                story=story_obj,
                is_authenticated=True,
                show_save_option=True
            )
        else:
            session['pending_story'] = story_obj
            return render_template(
                'story.html',
                story=story_obj,
                is_authenticated=False,
                show_save_option=False,
                show_login_prompt=True
            )

    pending_story = session.pop('pending_story', None)
    if pending_story:
        return render_template(
            'story.html',
            story=pending_story,
            is_authenticated=False,
            show_save_option=False,
            show_login_prompt=True
        )

    return render_template('story.html', story=None, is_authenticated='user_id' in session)

@app.route('/save_after_login', methods=['POST'])
def save_after_login():
    if 'user_id' not in session:
        flash('Lütfen giriş yapın veya hesap oluşturun.', 'error')
        return redirect(url_for('login'))

    pending_story = session.pop('pending_story', None)
    if not pending_story:
        flash('Kaydedilecek bir hikaye bulunamadı.', 'error')
        return redirect(url_for('story'))

    try:
        story = Story(
            genre=pending_story['genre'],
            plot=pending_story['plot'],
            writing_style=pending_story['writing_style'],
            chapter_count=pending_story['chapter_count'],
            content=pending_story['content'],
            user_id=session['user_id']
        )
        db.session.add(story)
        db.session.commit()
        flash('Hikaye başarıyla kütüphanenize kaydedildi.', 'success')
        return redirect(url_for('library'))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save story after login: {str(e)}")
        flash('Hikaye kaydedilirken bir hata oluştu.', 'error')
        session['pending_story'] = pending_story
        return redirect(url_for('story'))

@app.route('/save_story', methods=['POST'])
def save_story():
    if 'user_id' not in session:
        flash('Lütfen giriş yapın veya hesap oluşturun.', 'error')
        return redirect(url_for('login'))

    try:
        data = {
            'genre': request.form.get('genre'),
            'plot': request.form.get('plot'),
            'writing_style': request.form.get('writing_style'),
            'chapter_count': int(request.form.get('chapter_count', 1)),
            'content': request.form.get('content')
        }

        story = Story(
            genre=data['genre'],
            plot=data['plot'],
            writing_style=data['writing_style'],
            chapter_count=data['chapter_count'],
            content=data['content'],
            user_id=session['user_id']
        )
        db.session.add(story)
        db.session.commit()

        flash('Hikaye başarıyla kütüphanenize kaydedildi.', 'success')
        return redirect(url_for('library'))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save story: {str(e)}")
        flash('Hikaye kaydedilirken bir hata oluştu.', 'error')
        return redirect(url_for('story'))

@app.route('/delete_story', methods=['POST'])
def delete_story():
    if 'user_id' not in session:
        flash('Lütfen giriş yapın.', 'error')
        return redirect(url_for('login'))
    story_id = request.form.get('story_id')
    if not story_id:
        flash('Hikaye bulunamadı.', 'error')
        return redirect(url_for('library'))
    story = Story.query.filter_by(id=story_id, user_id=session['user_id']).first()
    if not story:
        flash('Hikaye bulunamadı veya silme yetkiniz yok.', 'error')
        return redirect(url_for('library'))
    try:
        db.session.delete(story)
        db.session.commit()
        flash('Hikaye silindi.', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Hikaye silinirken bir hata oluştu.', 'error')
    return redirect(url_for('library'))

@app.route('/library')
def library():
    if 'user_id' not in session:
        flash('Kütüphaneyi görüntülemek için giriş yapınız', 'error')
        return redirect(url_for('login'))

    try:
        user_id = session['user_id']
        stories = Story.query.filter_by(user_id=user_id).order_by(Story.created_at.desc()).all()
        return render_template('library.html', stories=stories)
    except Exception as e:
        logger.error(f"Error loading library: {str(e)}")
        flash('Error loading your library', 'error')
        return redirect(url_for('index'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password'].strip()

        if not username or not password:
            flash('Kullanıcı adı ve şifre gereklidir.', 'error')
            return redirect(url_for('signup'))

        if len(password) < 8 or len(password) > 16:
            flash('Şifre 8-16 karakter uzunluğunda olmalıdır.', 'error')
            return redirect(url_for('signup'))

        if User.query.filter_by(username=username).first():
            flash('Kullanıcı adı zaten mevcut.', 'error')
            return redirect(url_for('signup'))

        try:
            user = User(username=username)
            user.set_password(password) 
            db.session.add(user)
            db.session.commit()
            flash('Hesap başarıyla oluşturuldu! Lütfen giriş yapınız.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            logger.error(f"Kullanıcı oluşturulurken hata: {str(e)}")
            flash('Hesap oluşturulurken bir hata oluştu.', 'error')
            return redirect(url_for('signup'))

    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password'].strip()

        if not username or not password:
            flash('Kullanıcı adı ve şifre gereklidir.', 'error')
            return redirect(url_for('login'))

        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password): 
            session['user_id'] = user.id
            flash('Giriş başarılı.', 'success')
            if session.get('pending_story'):
                return redirect(url_for('save_after_login'))
            return redirect(url_for('index'))
        else:
            flash('Geçersiz kullanıcı adı veya şifre.', 'error')
            return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('Başarıyla çıkış yapıldı.', 'success')
    return redirect(url_for('index'))

@app.route('/api/stories', methods=['POST'])
def api_create_story():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400

        try:
            data['chapter_count'] = max(1, min(int(data.get('chapter_count', 1)), 5))
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid chapter_count value'}), 400

        if not data.get('genre') or not data.get('plot'):
            return jsonify({'success': False, 'error': 'Hikaye türü ve konusu boş bırakılamaz.'}), 400

        story_content, error = generate_story(data)
        if error:
            return jsonify({'success': False, 'error': error}), 500

        if 'user_id' in session:
            try:
                story = Story(
                    genre=data['genre'],
                    plot=data['plot'],
                    writing_style=data.get('writing_style', ''),
                    chapter_count=data['chapter_count'],
                    content=story_content,
                    user_id=session['user_id']
                )
                db.session.add(story)
                db.session.commit()

                return jsonify({
                    'success': True,
                    'id': story.id,
                    'content': story.content,
                    'message': 'Story created and saved successfully.'
                }), 201
            except Exception as e:
                db.session.rollback()
                return jsonify({'success': False, 'error': 'Failed to save story to database.'}), 500
        else:
            session['pending_story'] = {
                'genre': data['genre'],
                'plot': data['plot'],
                'writing_style': data.get('writing_style', ''),
                'chapter_count': data['chapter_count'],
                'content': story_content
            }
            return jsonify({
                'success': True,
                'redirect': url_for('story'),
                'message': 'Story generated but not saved. Please log in to save it.'
            }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': 'An unexpected error occurred.'}), 500

@app.route('/story/<id>')
def view_story(id):
    story = Story.query.get(id)
    if not story:
        flash('Story not found.', 'error')
        return redirect(url_for('index'))
    return render_template('story.html', story=story, user_id=session.get('user_id'))

@app.route('/api/stories/<story_id>', methods=['DELETE'])
def delete_story_api(story_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Giriş yapmalısınız'}), 401

    story = Story.query.filter_by(id=story_id, user_id=session['user_id']).first()
    if not story:
        return jsonify({'success': False, 'error': 'Hikaye bulunamadı veya silme yetkiniz yok'}), 404

    try:
        db.session.delete(story)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Veritabanı hatası'}), 500
    
@app.context_processor
def inject_user():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        return dict(current_user=user)
    return dict(current_user=None)

@app.errorhandler(404)
def page_not_found(e):
    return "404 Not Found: The requested URL was not found on the server.", 404

@app.errorhandler(500)
def internal_server_error(e):
    return "500 Internal Server Error: An unexpected error occurred on the server.", 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
