#!/usr/bin/env python3
"""
Jarvis Desktop Widget - Simplified Version
File-based messaging instead of API
"""

import sys
import random
import json
import os
from datetime import datetime
from PyQt5.QtWidgets import (QApplication, QWidget, QLabel, 
                             QLineEdit, QSystemTrayIcon, QMenu, QAction,
                             QPushButton)
from PyQt5.QtCore import Qt, QTimer, QPoint
from PyQt5.QtGui import QPainter, QColor, QPen, QBrush, QIcon, QPixmap

MESSAGES_DIR = "C:\\Jarvis\\messages"
INBOX_DIR = os.path.join(MESSAGES_DIR, "inbox")
OUTBOX_DIR = os.path.join(MESSAGES_DIR, "outbox")

class JarvisWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.dragging = False
        self.offset = QPoint()
        self.animation_state = "idle"
        self.blink_timer = QTimer()
        self.idle_timer = QTimer()
        self.poll_timer = QTimer()
        self.input_visible = False
        
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
        
        self.setFixedSize(200, 320)
        
        screen = QApplication.desktop().screenGeometry()
        self.move(screen.width() - 250, screen.height() - 400)
        
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
        
        self.show()
        
    def setup_animations(self):
        self.blink_timer.timeout.connect(self.blink)
        self.blink_timer.start(3000)
        
        self.idle_timer.timeout.connect(self.idle_animation)
        self.idle_timer.start(5000)
        
        # Poll for incoming messages every 2 seconds
        self.poll_timer.timeout.connect(self.check_inbox)
        self.poll_timer.start(2000)
        
        # Walking animation
        self.walk_timer = QTimer()
        self.walk_timer.timeout.connect(self.walk)
        self.walk_timer.start(50)  # 50ms for smooth animation
        
        # Walking state
        self.walking = False
        self.walk_direction = 1  # 1 = right, -1 = left
        self.walk_speed = 2
        
        # Start walking after a delay
        QTimer.singleShot(5000, self.start_walking)
        
    def check_inbox(self):
        """Check for new messages from Clawdbot"""
        try:
            for filename in os.listdir(INBOX_DIR):
                if filename.endswith('.json'):
                    filepath = os.path.join(INBOX_DIR, filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        msg = json.load(f)
                    
                    # Show message
                    self.show_speech(msg.get('text', '...'), duration=8000)
                    
                    # Delete after reading
                    os.remove(filepath)
        except Exception as e:
            pass  # Silent fail
        
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        self.draw_robot(painter)
        
    def draw_robot(self, painter):
        body_color = QColor(70, 130, 180)
        eye_color = QColor(100, 200, 255)
        
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
        """Start random walking"""
        if not self.walking and random.random() < 0.8:  # 80% chance
            self.walking = True
            self.walk_direction = random.choice([1, -1])
            # Stop walking after random duration
            duration = random.randint(5000, 12000)  # Walk longer
            QTimer.singleShot(duration, self.stop_walking)
        
        # Schedule next walk (more frequent)
        next_walk = random.randint(3000, 8000)
        QTimer.singleShot(next_walk, self.start_walking)
    
    def stop_walking(self):
        """Stop walking"""
        self.walking = False
    
    def walk(self):
        """Animate walking on taskbar"""
        if not self.walking or self.dragging:
            return
        
        screen = QApplication.desktop().screenGeometry()
        current_pos = self.pos()
        
        # Move horizontally
        new_x = current_pos.x() + (self.walk_speed * self.walk_direction)
        
        # Stay on screen, reverse direction at edges
        if new_x < 0:
            new_x = 0
            self.walk_direction = 1
        elif new_x > screen.width() - self.width():
            new_x = screen.width() - self.width()
            self.walk_direction = -1
        
        # Keep at bottom (taskbar level)
        taskbar_height = 40  # approximate
        new_y = screen.height() - self.height() - taskbar_height
        
        self.move(new_x, new_y)
    
    def show_speech(self, text, duration=3000):
        self.speech_label.setText(text)
        
        # Adjust height based on text length
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
        
        # Write to outbox
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
            QTimer.singleShot(2000, self.toggle_input)
            
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
        
        QTimer.singleShot(500, lambda: self.widget.show_speech("Jarvis aktif! 🤖", 3000))
        
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
        self.tray.setToolTip("Jarvis Desktop Widget")
        
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
