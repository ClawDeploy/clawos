#!/usr/bin/env python3
"""
Jarvis Desktop Widget - Minimalist Robot Companion
Windows 2D desktop character with speech and animations
Connected to Clawdbot for real conversations
"""

import sys
import random
import requests
import json
from PyQt5.QtWidgets import (QApplication, QWidget, QLabel, QVBoxLayout, 
                             QLineEdit, QSystemTrayIcon, QMenu, QAction,
                             QPushButton, QHBoxLayout)
from PyQt5.QtCore import Qt, QTimer, QPoint, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QPainter, QColor, QPen, QBrush, QIcon, QPixmap

class ClawdbotAPI(QThread):
    """Thread for Clawdbot API communication"""
    response_received = pyqtSignal(str)
    
    def __init__(self, message, gateway_url, token):
        super().__init__()
        self.message = message
        self.gateway_url = gateway_url
        self.token = token
        
    def run(self):
        """Send message to Clawdbot via WebSocket simulation"""
        try:
            # Use the message API to send via Telegram
            url = f"{self.gateway_url}/api/message/send"
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            payload = {
                "action": "send",
                "channel": "telegram",
                "target": "1717105483",  # Ozan's Telegram ID
                "message": f"[Desktop Widget] {self.message}"
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=35)
            
            if response.status_code == 200:
                self.response_received.emit("Mesaj gönderildi! Telegram'dan cevap gelecek 📱")
            else:
                self.response_received.emit(f"Hata: {response.status_code}")
        except Exception as e:
            self.response_received.emit(f"Bağlantı hatası: {str(e)}")


class JarvisWidget(QWidget):
    def __init__(self, gateway_url=None, token=None):
        super().__init__()
        self.dragging = False
        self.offset = QPoint()
        self.animation_state = "idle"
        self.blink_timer = QTimer()
        self.idle_timer = QTimer()
        self.gateway_url = gateway_url
        self.token = token
        self.api_thread = None
        self.input_visible = False
        
        self.init_ui()
        self.setup_animations()
        
    def init_ui(self):
        # Frameless, always on top, transparent background
        self.setWindowFlags(
            Qt.FramelessWindowHint | 
            Qt.WindowStaysOnTopHint | 
            Qt.Tool
        )
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_DeleteOnClose)
        
        # Window size
        self.setFixedSize(200, 320)  # Increased for input field
        
        # Position (bottom right corner)
        screen = QApplication.desktop().screenGeometry()
        self.move(screen.width() - 250, screen.height() - 400)
        
        # Speech bubble label
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
        
        # Input field for chatting
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
        # Blink animation
        self.blink_timer.timeout.connect(self.blink)
        self.blink_timer.start(3000)  # Blink every 3 seconds
        
        # Idle animation
        self.idle_timer.timeout.connect(self.idle_animation)
        self.idle_timer.start(5000)  # Random movement every 5 seconds
        
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # Draw robot body (minimalist style)
        self.draw_robot(painter)
        
    def draw_robot(self, painter):
        # Colors
        body_color = QColor(70, 130, 180)  # Steel blue
        eye_color = QColor(100, 200, 255)  # Light blue
        
        # Body position
        x_center = 100
        y_base = 180
        
        # Head (rounded rectangle)
        painter.setBrush(QBrush(body_color))
        painter.setPen(QPen(QColor(50, 50, 50), 3))
        painter.drawRoundedRect(60, y_base - 100, 80, 70, 15, 15)
        
        # Antenna
        painter.setPen(QPen(QColor(50, 50, 50), 2))
        painter.drawLine(x_center, y_base - 100, x_center, y_base - 115)
        painter.setBrush(QBrush(QColor(255, 100, 100)))
        painter.drawEllipse(x_center - 5, y_base - 120, 10, 10)
        
        # Eyes (animated based on state)
        eye_y = y_base - 75
        if self.animation_state == "blink":
            # Closed eyes (lines)
            painter.setPen(QPen(QColor(50, 50, 50), 2))
            painter.drawLine(75, eye_y, 85, eye_y)
            painter.drawLine(115, eye_y, 125, eye_y)
        else:
            # Open eyes (circles)
            painter.setBrush(QBrush(eye_color))
            painter.setPen(QPen(QColor(50, 50, 50), 2))
            painter.drawEllipse(75, eye_y - 5, 10, 10)
            painter.drawEllipse(115, eye_y - 5, 10, 10)
        
        # Mouth (simple line, changes with state)
        mouth_y = y_base - 50
        painter.setPen(QPen(QColor(50, 50, 50), 2))
        if self.animation_state == "talking":
            # Open mouth (arc)
            painter.drawArc(85, mouth_y - 5, 30, 15, 0, -180 * 16)
        else:
            # Neutral/happy
            painter.drawLine(85, mouth_y, 115, mouth_y)
        
        # Body (rectangle)
        painter.setBrush(QBrush(body_color))
        painter.drawRoundedRect(70, y_base - 25, 60, 50, 10, 10)
        
        # Arms
        painter.setPen(QPen(body_color, 6, Qt.SolidLine, Qt.RoundCap))
        painter.drawLine(70, y_base - 10, 50, y_base + 10)  # Left arm
        painter.drawLine(130, y_base - 10, 150, y_base + 10)  # Right arm
        
        # Legs
        painter.drawLine(85, y_base + 25, 85, y_base + 50)  # Left leg
        painter.drawLine(115, y_base + 25, 115, y_base + 50)  # Right leg
        
    def blink(self):
        """Blink animation"""
        self.animation_state = "blink"
        self.update()
        QTimer.singleShot(150, self.reset_animation)
        
    def reset_animation(self):
        """Reset to idle state"""
        self.animation_state = "idle"
        self.update()
        
    def idle_animation(self):
        """Random idle movements"""
        # Randomly show a thought
        thoughts = [
            "💭",
            "🔧",
            "⚡",
            "💡"
        ]
        # Sometimes show emoji thought
        if random.random() < 0.3:
            self.show_speech(random.choice(thoughts), duration=2000)
    
    def show_speech(self, text, duration=3000):
        """Show speech bubble with text"""
        self.speech_label.setText(text)
        self.speech_label.show()
        
        # Talking animation
        self.animation_state = "talking"
        self.update()
        
        # Hide after duration
        QTimer.singleShot(duration, self.hide_speech)
        
    def hide_speech(self):
        """Hide speech bubble"""
        self.speech_label.hide()
        self.animation_state = "idle"
        self.update()
    
    def mousePressEvent(self, event):
        """Handle mouse press for dragging and interaction"""
        if event.button() == Qt.LeftButton:
            self.dragging = True
            self.offset = event.pos()
        elif event.button() == Qt.RightButton:
            # Right click - show menu or interact
            self.on_interact()
            
    def mouseMoveEvent(self, event):
        """Handle dragging"""
        if self.dragging:
            self.move(self.mapToParent(event.pos() - self.offset))
            
    def mouseReleaseEvent(self, event):
        """Stop dragging"""
        if event.button() == Qt.LeftButton:
            self.dragging = False
    
    def mouseDoubleClickEvent(self, event):
        """Double click to interact"""
        self.on_interact()
        
    def on_interact(self):
        """Handle interaction (talk to Jarvis)"""
        if self.gateway_url and self.token:
            # Show input field
            self.toggle_input()
        else:
            # No connection, show greeting
            greetings = [
                "Evet efendim? 🤖",
                "Nasıl yardımcı olabilirim?",
                "Buradayım! 💙",
                "Komutunuz?",
                "Dinliyorum 👂"
            ]
            self.show_speech(random.choice(greetings), duration=3000)
    
    def toggle_input(self):
        """Show/hide input field"""
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
        """Send message to Clawdbot"""
        message = self.input_field.text().strip()
        if not message:
            return
            
        # Clear input
        self.input_field.clear()
        
        # Show "thinking"
        self.show_speech("🤔 Düşünüyorum...", duration=60000)
        
        # Send to Clawdbot
        self.api_thread = ClawdbotAPI(message, self.gateway_url, self.token)
        self.api_thread.response_received.connect(self.on_response)
        self.api_thread.start()
        
    def on_response(self, response):
        """Handle Clawdbot response"""
        # Show response
        self.show_speech(response, duration=8000)
        
        # Hide input after response
        QTimer.singleShot(500, self.toggle_input)
        
    def closeEvent(self, event):
        """Clean up on close"""
        self.blink_timer.stop()
        self.idle_timer.stop()
        event.accept()


class JarvisApp:
    """Main application with system tray"""
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setQuitOnLastWindowClosed(False)
        
        # Load configuration
        self.gateway_url, self.token = self.load_config()
        
        # Create widget
        self.widget = JarvisWidget(self.gateway_url, self.token)
        
        # Create system tray icon
        self.create_tray_icon()
        
        # Welcome message
        QTimer.singleShot(500, lambda: self.widget.show_speech("Jarvis aktif! 🤖", 3000))
    
    def load_config(self):
        """Load configuration from config.json"""
        try:
            with open('config.json', 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('gateway_url'), config.get('token')
        except FileNotFoundError:
            print("⚠️ config.json not found. Creating default config...")
            default_config = {
                "gateway_url": "http://localhost:3000",
                "token": "your-gateway-token-here",
                "comment": "Edit this file with your Clawdbot gateway URL and token"
            }
            with open('config.json', 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2)
            return None, None
        except Exception as e:
            print(f"❌ Config error: {e}")
            return None, None
        
    def create_tray_icon(self):
        """Create system tray icon and menu"""
        # Create icon (simple colored circle as placeholder)
        pixmap = QPixmap(64, 64)
        pixmap.fill(Qt.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setBrush(QBrush(QColor(70, 130, 180)))
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(4, 4, 56, 56)
        painter.end()
        
        icon = QIcon(pixmap)
        
        # System tray
        self.tray = QSystemTrayIcon(icon, self.app)
        self.tray.setToolTip("Jarvis Desktop Widget")
        
        # Tray menu
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
        """Handle tray icon click"""
        if reason == QSystemTrayIcon.Trigger:
            # Left click - show/hide widget
            if self.widget.isVisible():
                self.widget.hide()
            else:
                self.widget.show()
                
    def quit_app(self):
        """Quit application"""
        self.widget.close()
        self.tray.hide()
        self.app.quit()
        
    def run(self):
        """Run the application"""
        return self.app.exec_()


def main():
    jarvis_app = JarvisApp()
    sys.exit(jarvis_app.run())


if __name__ == '__main__':
    main()
