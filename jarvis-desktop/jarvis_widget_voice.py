#!/usr/bin/env python3
"""
Jarvis Desktop Widget - Voice Edition
With speech recognition and text-to-speech
"""

import sys
import random
import json
import os
import threading
from datetime import datetime
from PyQt5.QtWidgets import (QApplication, QWidget, QLabel, 
                             QLineEdit, QSystemTrayIcon, QMenu, QAction,
                             QPushButton)
from PyQt5.QtCore import Qt, QTimer, QPoint, pyqtSignal, QObject
from PyQt5.QtGui import QPainter, QColor, QPen, QBrush, QIcon, QPixmap

try:
    import pyttsx3
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    print("⚠️ pyttsx3 not installed. Voice output disabled.")

try:
    import speech_recognition as sr
    STT_AVAILABLE = True
except ImportError:
    STT_AVAILABLE = False
    print("⚠️ SpeechRecognition not installed. Voice input disabled.")

MESSAGES_DIR = "C:\\Jarvis\\messages"
INBOX_DIR = os.path.join(MESSAGES_DIR, "inbox")
OUTBOX_DIR = os.path.join(MESSAGES_DIR, "outbox")

class VoiceSignals(QObject):
    """Signals for voice thread communication"""
    speech_detected = pyqtSignal(str)
    listening_started = pyqtSignal()
    listening_stopped = pyqtSignal()

class JarvisWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.dragging = False
        self.offset = QPoint()
        self.animation_state = "idle"
        self.blink_timer = QTimer()
        self.idle_timer = QTimer()
        self.poll_timer = QTimer()
        self.walk_timer = QTimer()
        self.input_visible = False
        self.walking = False
        self.walk_direction = 1
        self.walk_speed = 2
        self.listening = False
        
        # Voice signals
        self.voice_signals = VoiceSignals()
        self.voice_signals.speech_detected.connect(self.on_voice_input)
        self.voice_signals.listening_started.connect(self.on_listening_start)
        self.voice_signals.listening_stopped.connect(self.on_listening_stop)
        
        # TTS engine
        if TTS_AVAILABLE:
            self.tts_engine = pyttsx3.init()
            self.tts_engine.setProperty('rate', 175)
            self.tts_engine.setProperty('volume', 0.9)
        else:
            self.tts_engine = None
        
        # Create message directories
        os.makedirs(INBOX_DIR, exist_ok=True)
        os.makedirs(OUTBOX_DIR, exist_ok=True)
        
        self.init_ui()
        self.setup_animations()
        
    def init_ui(self):
        self.setWindowFlags(
            Qt.FramelessWindowHint | 
            Qt.WindowStaysOnTopHint | 
            Qt.Tool
        )
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_DeleteOnClose)
        
        self.setFixedSize(200, 350)
        
        screen = QApplication.desktop().screenGeometry()
        self.move(screen.width() - 250, screen.height() - 430)
        
        # Speech bubble
        self.speech_label = QLabel("Merhaba! 🤖", self)
        self.speech_label.setStyleSheet("""
            QLabel {
                background-color: rgba(255, 255, 255, 230);
                border: 2px solid #333;
                border-radius: 15px;
                padding: 10px;
                color: #333;
                font-size: 12px;
            }
        """)
        self.speech_label.setWordWrap(True)
        self.speech_label.setAlignment(Qt.AlignCenter)
        self.speech_label.setGeometry(10, 10, 180, 60)
        self.speech_label.hide()
        
        # Input field
        self.input_field = QLineEdit(self)
        self.input_field.setPlaceholderText("Mesajını yaz...")
        self.input_field.setStyleSheet("""
            QLineEdit {
                background-color: rgba(255, 255, 255, 230);
                border: 2px solid #4682B4;
                border-radius: 10px;
                padding: 8px;
                color: #333;
                font-size: 11px;
            }
        """)
        self.input_field.setGeometry(10, 260, 140, 35)
        self.input_field.returnPressed.connect(self.send_message)
        self.input_field.hide()
        
        # Send button
        self.send_button = QPushButton("📤", self)
        self.send_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(70, 130, 180, 230);
                border: 2px solid #333;
                border-radius: 10px;
                color: white;
                font-size: 14px;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: rgba(100, 160, 210, 230);
            }
        """)
        self.send_button.setGeometry(155, 260, 35, 35)
        self.send_button.clicked.connect(self.send_message)
        self.send_button.hide()
        
        # Voice button (microphone)
        self.voice_button = QPushButton("🎤", self)
        self.voice_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(70, 180, 130, 230);
                border: 2px solid #333;
                border-radius: 10px;
                color: white;
                font-size: 14px;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: rgba(100, 210, 160, 230);
            }
        """)
        self.voice_button.setGeometry(10, 300, 180, 35)
        self.voice_button.clicked.connect(self.toggle_voice_input)
        if not STT_AVAILABLE:
            self.voice_button.hide()
        
        self.show()
        
    def setup_animations(self):
        self.blink_timer.timeout.connect(self.blink)
        self.blink_timer.start(3000)
        
        self.idle_timer.timeout.connect(self.idle_animation)
        self.idle_timer.start(5000)
        
        self.poll_timer.timeout.connect(self.check_inbox)
        self.poll_timer.start(2000)
        
        self.walk_timer.timeout.connect(self.walk)
        self.walk_timer.start(50)
        
        QTimer.singleShot(5000, self.start_walking)
        
    def check_inbox(self):
        """Check for new messages from Clawdbot"""
        try:
            for filename in os.listdir(INBOX_DIR):
                if filename.endswith('.json'):
                    filepath = os.path.join(INBOX_DIR, filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        msg = json.load(f)
                    
                    text = msg.get('text', '...')
                    self.show_speech(text, duration=8000)
                    
                    # Speak the message
                    self.speak(text)
                    
                    os.remove(filepath)
        except Exception as e:
            pass
        
    def speak(self, text):
        """Text-to-speech"""
        if not self.tts_engine:
            return
        
        def tts_thread():
            try:
                self.tts_engine.say(text)
                self.tts_engine.runAndWait()
            except:
                pass
        
        threading.Thread(target=tts_thread, daemon=True).start()
        
    def toggle_voice_input(self):
        """Start/stop voice input"""
        if not STT_AVAILABLE:
            return
        
        if self.listening:
            self.listening = False
            self.voice_button.setText("🎤")
        else:
            self.listening = True
            self.voice_button.setText("🔴")
            threading.Thread(target=self.listen_voice, daemon=True).start()
    
    def listen_voice(self):
        """Listen for voice input"""
        self.voice_signals.listening_started.emit()
        
        recognizer = sr.Recognizer()
        try:
            with sr.Microphone() as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            
            # Recognize speech
            text = recognizer.recognize_google(audio, language="tr-TR")
            self.voice_signals.speech_detected.emit(text)
            
        except sr.WaitTimeoutError:
            pass
        except sr.UnknownValueError:
            self.voice_signals.speech_detected.emit("[Anlaşılamadı]")
        except sr.RequestError:
            self.voice_signals.speech_detected.emit("[Bağlantı hatası]")
        except Exception as e:
            pass
        finally:
            self.voice_signals.listening_stopped.emit()
    
    def on_listening_start(self):
        """Visual feedback when listening starts"""
        self.show_speech("🎤 Dinliyorum...", duration=10000)
    
    def on_listening_stop(self):
        """Visual feedback when listening stops"""
        self.listening = False
        self.voice_button.setText("🎤")
    
    def on_voice_input(self, text):
        """Handle voice input"""
        if text == "[Anlaşılamadı]" or text == "[Bağlantı hatası]":
            self.show_speech(text, duration=2000)
            return
        
        # Show recognized text
        self.show_speech(f"Sen: {text}", duration=3000)
        
        # Send as message
        self.send_message_text(text)
        
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        self.draw_robot(painter)
        
    def draw_robot(self, painter):
        body_color = QColor(70, 130, 180)
        eye_color = QColor(100, 200, 255)
        
        # Add red glow when listening
        if self.listening:
            body_color = QColor(180, 70, 70)
            eye_color = QColor(255, 100, 100)
        
        x_center = 100
        y_base = 180
        
        # Head
        painter.setBrush(QBrush(body_color))
        painter.setPen(QPen(QColor(50, 50, 50), 3))
        painter.drawRoundedRect(60, y_base - 100, 80, 70, 15, 15)
        
        # Antenna
        painter.setPen(QPen(QColor(50, 50, 50), 2))
        painter.drawLine(x_center, y_base - 100, x_center, y_base - 115)
        painter.setBrush(QBrush(QColor(255, 100, 100)))
        painter.drawEllipse(x_center - 5, y_base - 120, 10, 10)
        
        # Eyes
        eye_y = y_base - 75
        if self.animation_state == "blink":
            painter.setPen(QPen(QColor(50, 50, 50), 2))
            painter.drawLine(75, eye_y, 85, eye_y)
            painter.drawLine(115, eye_y, 125, eye_y)
        else:
            painter.setBrush(QBrush(eye_color))
            painter.setPen(QPen(QColor(50, 50, 50), 2))
            painter.drawEllipse(75, eye_y - 5, 10, 10)
            painter.drawEllipse(115, eye_y - 5, 10, 10)
        
        # Mouth
        mouth_y = y_base - 50
        painter.setPen(QPen(QColor(50, 50, 50), 2))
        if self.animation_state == "talking":
            painter.drawArc(85, mouth_y - 5, 30, 15, 0, -180 * 16)
        else:
            painter.drawLine(85, mouth_y, 115, mouth_y)
        
        # Body
        painter.setBrush(QBrush(body_color))
        painter.drawRoundedRect(70, y_base - 25, 60, 50, 10, 10)
        
        # Arms
        painter.setPen(QPen(body_color, 6, Qt.SolidLine, Qt.RoundCap))
        painter.drawLine(70, y_base - 10, 50, y_base + 10)
        painter.drawLine(130, y_base - 10, 150, y_base + 10)
        
        # Legs
        painter.drawLine(85, y_base + 25, 85, y_base + 50)
        painter.drawLine(115, y_base + 25, 115, y_base + 50)
        
    def blink(self):
        self.animation_state = "blink"
        self.update()
        QTimer.singleShot(150, self.reset_animation)
        
    def reset_animation(self):
        self.animation_state = "idle"
        self.update()
        
    def idle_animation(self):
        thoughts = ["💭", "🔧", "⚡", "💡"]
        if random.random() < 0.3 and not self.walking:
            self.show_speech(random.choice(thoughts), duration=2000)
    
    def start_walking(self):
        if not self.walking and random.random() < 0.8:
            self.walking = True
            self.walk_direction = random.choice([1, -1])
            duration = random.randint(5000, 12000)
            QTimer.singleShot(duration, self.stop_walking)
        
        next_walk = random.randint(3000, 8000)
        QTimer.singleShot(next_walk, self.start_walking)
    
    def stop_walking(self):
        self.walking = False
    
    def walk(self):
        if not self.walking or self.dragging:
            return
        
        screen = QApplication.desktop().screenGeometry()
        current_pos = self.pos()
        
        new_x = current_pos.x() + (self.walk_speed * self.walk_direction)
        
        if new_x < 0:
            new_x = 0
            self.walk_direction = 1
        elif new_x > screen.width() - self.width():
            new_x = screen.width() - self.width()
            self.walk_direction = -1
        
        taskbar_height = 40
        new_y = screen.height() - self.height() - taskbar_height
        
        self.move(new_x, new_y)
    
    def show_speech(self, text, duration=3000):
        self.speech_label.setText(text)
        
        char_count = len(text)
        if char_count < 30:
            height = 60
        elif char_count < 80:
            height = 90
        elif char_count < 150:
            height = 130
        else:
            height = 170
        
        self.speech_label.setGeometry(10, 10, 180, height)
        self.speech_label.show()
        self.animation_state = "talking"
        self.update()
        QTimer.singleShot(duration, self.hide_speech)
        
    def hide_speech(self):
        self.speech_label.hide()
        self.animation_state = "idle"
        self.update()
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = True
            self.offset = event.pos()
        elif event.button() == Qt.RightButton:
            self.on_interact()
            
    def mouseMoveEvent(self, event):
        if self.dragging:
            self.move(self.mapToParent(event.pos() - self.offset))
            
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = False
    
    def mouseDoubleClickEvent(self, event):
        self.on_interact()
        
    def on_interact(self):
        self.toggle_input()
    
    def toggle_input(self):
        if self.input_visible:
            self.input_field.hide()
            self.send_button.hide()
            self.input_visible = False
        else:
            self.input_field.show()
            self.send_button.show()
            self.input_field.setFocus()
            self.input_visible = True
            
    def send_message(self):
        message = self.input_field.text().strip()
        if not message:
            return
        self.input_field.clear()
        self.send_message_text(message)
        QTimer.singleShot(500, self.toggle_input)
    
    def send_message_text(self, message):
        """Send message to outbox"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"msg_{timestamp}.json"
            filepath = os.path.join(OUTBOX_DIR, filename)
            
            msg_data = {
                "text": message,
                "timestamp": datetime.now().isoformat()
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(msg_data, f, ensure_ascii=False, indent=2)
            
            self.show_speech("Mesaj gönderildi! 📤", duration=2000)
            
        except Exception as e:
            self.show_speech(f"Hata: {str(e)}", duration=3000)
        
    def closeEvent(self, event):
        self.blink_timer.stop()
        self.idle_timer.stop()
        self.poll_timer.stop()
        self.walk_timer.stop()
        event.accept()


class JarvisApp:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setQuitOnLastWindowClosed(False)
        
        self.widget = JarvisWidget()
        self.create_tray_icon()
        
        welcome = "Jarvis aktif! 🤖"
        QTimer.singleShot(500, lambda: self.widget.show_speech(welcome, 3000))
        if TTS_AVAILABLE:
            QTimer.singleShot(1000, lambda: self.widget.speak(welcome))
        
    def create_tray_icon(self):
        pixmap = QPixmap(64, 64)
        pixmap.fill(Qt.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setBrush(QBrush(QColor(70, 130, 180)))
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(4, 4, 56, 56)
        painter.end()
        
        icon = QIcon(pixmap)
        
        self.tray = QSystemTrayIcon(icon, self.app)
        self.tray.setToolTip("Jarvis Desktop Widget (Voice)")
        
        menu = QMenu()
        
        show_action = QAction("Göster", self.app)
        show_action.triggered.connect(self.widget.show)
        menu.addAction(show_action)
        
        hide_action = QAction("Gizle", self.app)
        hide_action.triggered.connect(self.widget.hide)
        menu.addAction(hide_action)
        
        menu.addSeparator()
        
        chat_action = QAction("💬 Konuş", self.app)
        chat_action.triggered.connect(self.widget.on_interact)
        menu.addAction(chat_action)
        
        if STT_AVAILABLE:
            voice_action = QAction("🎤 Sesli Konuş", self.app)
            voice_action.triggered.connect(self.widget.toggle_voice_input)
            menu.addAction(voice_action)
        
        menu.addSeparator()
        
        quit_action = QAction("Çıkış", self.app)
        quit_action.triggered.connect(self.quit_app)
        menu.addAction(quit_action)
        
        self.tray.setContextMenu(menu)
        self.tray.activated.connect(self.tray_clicked)
        self.tray.show()
        
    def tray_clicked(self, reason):
        if reason == QSystemTrayIcon.Trigger:
            if self.widget.isVisible():
                self.widget.hide()
            else:
                self.widget.show()
                
    def quit_app(self):
        self.widget.close()
        self.tray.hide()
        self.app.quit()
        
    def run(self):
        return self.app.exec_()


def main():
    jarvis_app = JarvisApp()
    sys.exit(jarvis_app.run())


if __name__ == '__main__':
    main()
