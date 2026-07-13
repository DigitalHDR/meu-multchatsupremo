#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Meu Multichat - Interface Qt6 (PySide6, LGPL)"""

import json
import os
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PySide6.QtCore import Qt, QTimer, QEvent
from PySide6.QtGui import QFont, QGuiApplication
from PySide6.QtWidgets import (
    QApplication,
    QAbstractSpinBox,
    QButtonGroup,
    QCheckBox,
    QComboBox,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QRadioButton,
    QScrollArea,
    QSizePolicy,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
PORTS = [3847, 3857, 3867]
FONT_SIZE_MIN = 10
FONT_SIZE_MAX = 36
FONT_SIZE_DEFAULT = 22
FONT_SIZE_FIXO_DEFAULT = 16
SOUND_INTERVALS = [0, 10, 20, 30, 40, 50, 60]
SOUND_ENABLED_DEFAULT = True
SOUND_INTERVAL_DEFAULT = 0

CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

DEFAULT_ENV = {
    "PORT": "3847",
    "TWITCH_CHANNEL": "",
    "KICK_CHANNEL": "",
    "YOUTUBE_CHANNEL": "",
    "YOUTUBE_VIDEO_ID": "",
    "TWITCH_OAUTH": "",
    "OVERLAY_FONT_SIZE": "22",
    "OVERLAY_FONT_SIZE_FIXO": "16",
    "NOTIFICATION_SOUND_ENABLED": "1",
    "NOTIFICATION_SOUND_INTERVAL": "0",
}

ROW_GAP = 12
FIELD_HEIGHT = 36
GROUP_INNER_TOP = 24

# Tema escuro (estilo editor / OBS)
COLOR_BG = "#282c34"
COLOR_BG_INPUT = "#1e2128"
COLOR_BG_INPUT_RO = "#252830"
COLOR_BORDER = "#3e4451"
COLOR_BORDER_FOCUS = "#9146ff"
COLOR_TEXT = "#eceff4"
COLOR_TEXT_MUTED = "#b8bcc4"
COLOR_ACCENT = "#9146ff"
COLOR_ACCENT_HOVER = "#7c3aed"

STYLESHEET = f"""
QMainWindow, QWidget {{
    background-color: {COLOR_BG};
    color: {COLOR_TEXT};
    font-family: "Segoe UI", sans-serif;
    font-size: 13px;
}}
QGroupBox {{
    font-weight: 600;
    border: 1px solid {COLOR_BORDER};
    border-radius: 8px;
    margin-top: 16px;
    background-color: {COLOR_BG};
    color: {COLOR_TEXT};
}}
QGroupBox::title {{
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 6px;
    color: {COLOR_TEXT};
    background-color: {COLOR_BG};
}}
QLabel {{
    background: transparent;
    color: {COLOR_TEXT};
}}
QWidget#channel_row, QWidget#obs_block, QWidget#space-between-row {{
    background: transparent;
}}
QLabel#field_label {{
    color: {COLOR_TEXT};
    background: transparent;
    padding: 0;
}}
QLabel#url_label {{
    color: {COLOR_TEXT_MUTED};
    font-size: 11px;
    background: transparent;
    padding: 0;
    margin: 0;
}}
QLabel#subtitle {{
    color: {COLOR_TEXT_MUTED};
    font-size: 12px;
    background: transparent;
}}
QLineEdit {{
    border: 1px solid {COLOR_BORDER};
    border-radius: 6px;
    padding: 8px 10px;
    background-color: {COLOR_BG_INPUT};
    color: {COLOR_TEXT};
    selection-background-color: {COLOR_ACCENT};
    selection-color: #ffffff;
}}
QLineEdit:focus {{
    border: 1px solid {COLOR_BORDER_FOCUS};
}}
QLineEdit:read-only {{
    background-color: {COLOR_BG_INPUT_RO};
    color: {COLOR_TEXT_MUTED};
}}
QSpinBox {{
    border: 1px solid {COLOR_BORDER};
    border-radius: 6px;
    padding: 4px 6px;
    background-color: {COLOR_BG_INPUT};
    color: {COLOR_TEXT};
}}
QSpinBox:focus {{
    border: 1px solid {COLOR_BORDER_FOCUS};
}}
QWidget#font_spin_wrap {{
    border: 1px solid {COLOR_BORDER};
    border-radius: 6px;
    background-color: {COLOR_BG_INPUT};
}}
QWidget#font_spin_wrap QSpinBox {{
    border: none;
    background: transparent;
    padding: 4px 4px 4px 8px;
}}
QWidget#font_spin_wrap QSpinBox:focus {{
    border: none;
}}
QPushButton#spin_arrow_up, QPushButton#spin_arrow_down {{
    border: none;
    border-left: 1px solid {COLOR_BORDER};
    background-color: {COLOR_BG_INPUT_RO};
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    padding: 0;
    margin: 0;
    min-height: 0;
    border-radius: 0;
}}
QPushButton#spin_arrow_up {{
    border-top-right-radius: 5px;
    border-bottom: 1px solid {COLOR_BORDER};
}}
QPushButton#spin_arrow_down {{
    border-bottom-right-radius: 5px;
}}
QPushButton#spin_arrow_up:hover, QPushButton#spin_arrow_down:hover {{
    background-color: {COLOR_BORDER};
    color: #ffffff;
}}
QPushButton {{
    border: 1px solid {COLOR_BORDER};
    border-radius: 6px;
    padding: 8px 16px;
    background-color: {COLOR_BG_INPUT};
    color: {COLOR_TEXT};
    min-height: 20px;
}}
QPushButton:hover {{
    background-color: {COLOR_BORDER};
    border-color: #5a6270;
}}
QPushButton#primary {{
    background-color: {COLOR_ACCENT};
    color: #ffffff;
    border: 1px solid {COLOR_ACCENT_HOVER};
    font-weight: 600;
}}
QPushButton#primary:hover {{
    background-color: {COLOR_ACCENT_HOVER};
}}
QRadioButton {{
    spacing: 8px;
    padding: 6px 4px;
    color: {COLOR_TEXT};
    background: transparent;
}}
QRadioButton::indicator {{
    width: 20px;
    height: 20px;
    border-radius: 10px;
}}
QRadioButton::indicator:unchecked {{
    border: 2px solid #c5cad3;
    background-color: {COLOR_BG_INPUT};
}}
QRadioButton::indicator:unchecked:hover {{
    border: 2px solid #ffffff;
    background-color: #353b47;
}}
QRadioButton::indicator:checked {{
    border: 2px solid {COLOR_ACCENT};
    background-color: {COLOR_ACCENT};
}}
QRadioButton::indicator:checked:hover {{
    border: 2px solid #a78bfa;
    background-color: {COLOR_ACCENT_HOVER};
}}
QRadioButton:disabled {{
    color: #6b7280;
}}
QRadioButton::indicator:disabled {{
    border: 2px solid #4b5563;
    background-color: #2a2f38;
}}
QCheckBox {{
    spacing: 10px;
    color: {COLOR_TEXT};
    background: transparent;
}}
QCheckBox::indicator {{
    width: 18px;
    height: 18px;
    border-radius: 4px;
}}
QCheckBox::indicator:unchecked {{
    border: 2px solid #c5cad3;
    background-color: {COLOR_BG_INPUT};
}}
QCheckBox::indicator:unchecked:hover {{
    border: 2px solid #ffffff;
}}
QCheckBox::indicator:checked {{
    border: 2px solid {COLOR_ACCENT};
    background-color: {COLOR_ACCENT};
}}
QCheckBox:disabled {{
    color: #6b7280;
}}
QComboBox {{
    border: 1px solid {COLOR_BORDER};
    border-radius: 6px;
    padding: 6px 10px;
    background-color: {COLOR_BG_INPUT};
    color: {COLOR_TEXT};
    min-height: 22px;
}}
QComboBox:hover {{
    border-color: {COLOR_BORDER_FOCUS};
}}
QComboBox:focus {{
    border: 1px solid {COLOR_BORDER_FOCUS};
}}
QComboBox:disabled {{
    color: {COLOR_TEXT_MUTED};
    background-color: {COLOR_BG_INPUT_RO};
}}
QComboBox::drop-down {{
    border: none;
    width: 28px;
}}
QComboBox QAbstractItemView {{
    background-color: {COLOR_BG_INPUT};
    color: {COLOR_TEXT};
    border: 1px solid {COLOR_BORDER};
    selection-background-color: {COLOR_ACCENT};
    selection-color: #ffffff;
}}
QLabel#status_ok {{ color: #4ade80; font-weight: 600; background: transparent; }}
QLabel#status_err {{ color: #f87171; font-weight: 600; background: transparent; }}
QLabel#status_idle {{ color: {COLOR_TEXT_MUTED}; background: transparent; }}
QLabel#port_free {{ color: #4ade80; font-size: 11px; background: transparent; }}
QLabel#port_busy {{ color: #f87171; font-size: 11px; background: transparent; }}
QLabel#port_active {{ color: #60a5fa; font-size: 11px; background: transparent; }}
QScrollArea {{
    border: none;
    background-color: {COLOR_BG};
}}
QScrollArea > QWidget > QWidget {{
    background-color: {COLOR_BG};
}}
QScrollBar:vertical {{
    background: {COLOR_BG};
    width: 12px;
    margin: 0;
    border: none;
}}
QScrollBar::handle:vertical {{
    background: {COLOR_BORDER};
    min-height: 36px;
    border-radius: 6px;
    margin: 2px;
}}
QScrollBar::handle:vertical:hover {{
    background: #5a6270;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
    height: 0;
    background: none;
}}
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {{
    background: none;
}}
"""


def read_env() -> dict:
    cfg = dict(DEFAULT_ENV)
    if not ENV_PATH.exists():
        return cfg
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip()
        if key in cfg:
            cfg[key] = val
    return cfg


def parse_sound_enabled(value) -> bool:
    raw = str(value if value is not None else "1").strip().lower()
    return raw not in {"0", "false", "off", "no", "nao", "não"}


def parse_sound_interval(value) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return SOUND_INTERVAL_DEFAULT
    return n if n in SOUND_INTERVALS else SOUND_INTERVAL_DEFAULT


def write_env(cfg: dict) -> None:
    port = str(cfg.get("PORT", "3847"))
    if int(port) not in PORTS:
        raise ValueError(f"Porta invalida. Use: {', '.join(map(str, PORTS))}")

    font_size = int(cfg.get("OVERLAY_FONT_SIZE", str(FONT_SIZE_DEFAULT)))
    font_size_fixo = int(cfg.get("OVERLAY_FONT_SIZE_FIXO", str(FONT_SIZE_FIXO_DEFAULT)))
    if font_size < FONT_SIZE_MIN or font_size > FONT_SIZE_MAX:
        raise ValueError(f"Tamanho da fonte invalido. Use entre {FONT_SIZE_MIN} e {FONT_SIZE_MAX}px.")
    if font_size_fixo < FONT_SIZE_MIN or font_size_fixo > FONT_SIZE_MAX:
        raise ValueError(f"Tamanho da fonte do chat fixo invalido. Use entre {FONT_SIZE_MIN} e {FONT_SIZE_MAX}px.")

    sound_enabled = "1" if parse_sound_enabled(cfg.get("NOTIFICATION_SOUND_ENABLED", "1")) else "0"
    sound_interval = parse_sound_interval(cfg.get("NOTIFICATION_SOUND_INTERVAL", str(SOUND_INTERVAL_DEFAULT)))

    content = f"""# Porta do servidor local
PORT={port}

# Canais
TWITCH_CHANNEL={cfg.get('TWITCH_CHANNEL', '')}
KICK_CHANNEL={cfg.get('KICK_CHANNEL', '')}

# YouTube
YOUTUBE_CHANNEL={cfg.get('YOUTUBE_CHANNEL', '')}
YOUTUBE_VIDEO_ID={cfg.get('YOUTUBE_VIDEO_ID', '')}

# Opcional: token OAuth do Twitch
TWITCH_OAUTH={cfg.get('TWITCH_OAUTH', '')}

# Aparencia do overlay
OVERLAY_FONT_SIZE={font_size}
OVERLAY_FONT_SIZE_FIXO={font_size_fixo}

# Som de notificacao (0 = a cada mensagem; 10-60 = intervalo minimo em segundos)
NOTIFICATION_SOUND_ENABLED={sound_enabled}
NOTIFICATION_SOUND_INTERVAL={sound_interval}
"""
    ENV_PATH.write_text(content, encoding="utf-8")


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def get_listening_pids(ports: list[int]) -> dict[int, int]:
    """Retorna {porta: pid} para portas em LISTEN no Windows."""
    out: dict[int, int] = {}
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True,
            text=True,
            creationflags=CREATE_NO_WINDOW,
            timeout=5,
        )
        for line in result.stdout.splitlines():
            if "LISTENING" not in line:
                continue
            for port in ports:
                if f":{port} " in line:
                    pid = line.split()[-1]
                    if pid.isdigit():
                        out[port] = int(pid)
                    break
    except Exception:
        pass
    return out


def stop_process_tree(pid: int) -> None:
    """Encerra processo e todos os filhos (ex.: Puppeteer/Chrome do Kick)."""
    subprocess.run(
        ["taskkill", "/F", "/T", "/PID", str(pid)],
        creationflags=CREATE_NO_WINDOW,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def stop_all_servers() -> None:
    seen: set[int] = set()
    for pid in get_listening_pids(PORTS).values():
        if pid not in seen:
            seen.add(pid)
            stop_process_tree(pid)


def start_server() -> subprocess.Popen:
    return subprocess.Popen(
        ["node", "server.js"],
        cwd=str(ROOT_DIR),
        creationflags=CREATE_NO_WINDOW,
    )


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Meu Multichat")
        self.setMinimumSize(520, 640)
        self.resize(540, 760)
        self.port_radios: dict[int, QRadioButton] = {}
        self.port_status_labels: dict[int, QLabel] = {}
        self._server_proc: subprocess.Popen | None = None
        self._cleaned_up = False
        self._build_ui()
        self._load_config()
        self._refresh_ports()

        self._move_timer = QTimer(self)
        self._move_timer.setSingleShot(True)
        self._move_timer.setInterval(500)
        self._move_timer.timeout.connect(self._resume_after_move)

        self._font_save_timer = QTimer(self)
        self._font_save_timer.setSingleShot(True)
        self._font_save_timer.setInterval(350)
        self._font_save_timer.timeout.connect(self._save_appearance_live)

        self.timer = QTimer(self)
        self.timer.timeout.connect(self._on_timer)
        self.timer.start(5000)
        self.installEventFilter(self)

    def _cleanup_processes(self) -> None:
        if self._cleaned_up:
            return
        self._cleaned_up = True

        self.timer.stop()
        self._move_timer.stop()

        if self._server_proc and self._server_proc.poll() is None:
            stop_process_tree(self._server_proc.pid)
            self._server_proc = None

        stop_all_servers()

    def closeEvent(self, event):
        self._cleanup_processes()
        super().closeEvent(event)

    def eventFilter(self, obj, event):
        if obj is self and event.type() in (
            QEvent.Type.Move,
            QEvent.Type.NonClientAreaMouseMove,
        ):
            if self.timer.isActive():
                self.timer.stop()
            self._move_timer.start()
        return super().eventFilter(obj, event)

    def _resume_after_move(self):
        if not self.timer.isActive():
            self.timer.start(5000)
        self._refresh_ports()

    def _set_label_state(self, label: QLabel, text: str, object_name: str) -> None:
        if label.text() != text:
            label.setText(text)
        if label.objectName() != object_name:
            label.setObjectName(object_name)
            label.style().unpolish(label)
            label.style().polish(label)

    def _prepare_field(self, field: QLineEdit) -> None:
        field.setFixedHeight(FIELD_HEIGHT)
        field.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)

    def _create_font_spin(self, default: int) -> QSpinBox:
        spin = QSpinBox()
        spin.setRange(FONT_SIZE_MIN, FONT_SIZE_MAX)
        spin.setSuffix(" px")
        spin.setValue(default)
        spin.setAlignment(Qt.AlignmentFlag.AlignRight)
        spin.setButtonSymbols(QAbstractSpinBox.ButtonSymbols.NoButtons)
        return spin

    def _wrap_spin_with_arrows(self, spin: QSpinBox, width: int = 108) -> QWidget:
        wrap = QWidget()
        wrap.setObjectName("font_spin_wrap")
        layout = QHBoxLayout(wrap)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        spin.setFixedHeight(FIELD_HEIGHT)
        layout.addWidget(spin, 1)

        arrows = QWidget()
        arrows.setFixedWidth(28)
        arrow_layout = QVBoxLayout(arrows)
        arrow_layout.setContentsMargins(0, 0, 0, 0)
        arrow_layout.setSpacing(0)

        half = FIELD_HEIGHT // 2
        btn_up = QPushButton("▲")
        btn_up.setObjectName("spin_arrow_up")
        btn_up.setFixedHeight(half)
        btn_up.setCursor(Qt.CursorShape.PointingHandCursor)

        btn_down = QPushButton("▼")
        btn_down.setObjectName("spin_arrow_down")
        btn_down.setFixedHeight(FIELD_HEIGHT - half)
        btn_down.setCursor(Qt.CursorShape.PointingHandCursor)

        btn_up.clicked.connect(spin.stepUp)
        btn_down.clicked.connect(spin.stepDown)
        arrow_layout.addWidget(btn_up)
        arrow_layout.addWidget(btn_down)
        layout.addWidget(arrows)

        wrap.setFixedSize(width, FIELD_HEIGHT)
        return wrap

    def _space_between_row(self, label_text: str, widget: QWidget, input_width: int = 108) -> QHBoxLayout:
        """Linha 50/50: rotulo a esquerda, input compacto a direita."""
        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        row.setSpacing(12)

        label = QLabel(label_text)
        label.setObjectName("field_label")

        if widget.objectName() != "font_spin_wrap":
            widget.setFixedSize(input_width, FIELD_HEIGHT)

        row.addWidget(label, 1, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        row.addWidget(widget, 1, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        return row

    def _channel_row(self, label_text: str, field: QLineEdit) -> QWidget:
        row_widget = QWidget()
        row_widget.setObjectName("channel_row")
        row_widget.setMinimumHeight(FIELD_HEIGHT + 4)
        row_widget.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Fixed)
        row_widget.setAutoFillBackground(False)
        row = QHBoxLayout(row_widget)
        row.setContentsMargins(0, 0, 0, 0)
        row.setSpacing(12)

        label = QLabel(label_text)
        label.setObjectName("field_label")
        label.setMinimumWidth(130)
        label.setAutoFillBackground(False)
        self._prepare_field(field)

        row.addWidget(label, 0, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        row.addWidget(field, 1)
        return row_widget

    def _obs_block(self, label: QLabel, row_layout: QHBoxLayout) -> QWidget:
        block = QWidget()
        block.setObjectName("obs_block")
        block.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Fixed)
        block.setAutoFillBackground(False)
        block_layout = QVBoxLayout(block)
        block_layout.setContentsMargins(0, 0, 0, 0)
        block_layout.setSpacing(8)
        block_layout.addWidget(label)
        block_layout.addLayout(row_layout)
        return block

    def _build_ui(self):
        scroll = QScrollArea()
        scroll.setObjectName("main_scroll")
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.setCentralWidget(scroll)

        form = QWidget()
        form.setObjectName("main_form")
        form.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)
        scroll.setWidget(form)

        layout = QVBoxLayout(form)
        layout.setContentsMargins(20, 16, 28, 16)
        layout.setSpacing(14)
        layout.setSizeConstraint(QVBoxLayout.SizeConstraint.SetMinimumSize)

        title = QLabel("Configuracao do Multichat")
        title.setFont(QFont("Segoe UI", 16, QFont.Weight.DemiBold))
        layout.addWidget(title)

        subtitle = QLabel("Overlay de chat para OBS - Twitch, Kick e YouTube")
        subtitle.setObjectName("subtitle")
        layout.addWidget(subtitle)

        # Canais
        grp_channels = QGroupBox("Canais")
        channels_layout = QVBoxLayout(grp_channels)
        channels_layout.setContentsMargins(14, GROUP_INNER_TOP, 14, 14)
        channels_layout.setSpacing(ROW_GAP)

        self.twitch = QLineEdit()
        self.kick = QLineEdit()
        self.yt_channel = QLineEdit()
        self.yt_video = QLineEdit()

        channels_layout.addWidget(self._channel_row("Twitch:", self.twitch))
        channels_layout.addWidget(self._channel_row("Kick:", self.kick))
        channels_layout.addWidget(self._channel_row("YouTube canal:", self.yt_channel))
        channels_layout.addWidget(self._channel_row("YouTube video ID:", self.yt_video))
        layout.addWidget(grp_channels)

        grp_appearance = QGroupBox("Aparencia do overlay")
        appearance_layout = QVBoxLayout(grp_appearance)
        appearance_layout.setContentsMargins(14, GROUP_INNER_TOP, 14, 14)
        appearance_layout.setSpacing(ROW_GAP)

        self.font_size = self._create_font_spin(FONT_SIZE_DEFAULT)
        self.font_size_fixo = self._create_font_spin(FONT_SIZE_FIXO_DEFAULT)

        font_public_wrap = self._wrap_spin_with_arrows(self.font_size)
        font_fixo_wrap = self._wrap_spin_with_arrows(self.font_size_fixo)

        font_public_row = QWidget()
        font_public_row.setObjectName("space-between-row")
        font_public_row.setLayout(
            self._space_between_row("Overlay publico:", font_public_wrap)
        )

        font_fixo_row = QWidget()
        font_fixo_row.setObjectName("space-between-row")
        font_fixo_row.setLayout(
            self._space_between_row("Chat fixo (streamer):", font_fixo_wrap)
        )

        appearance_layout.addWidget(font_public_row)
        appearance_layout.addWidget(font_fixo_row)
        self.font_size.valueChanged.connect(self._schedule_appearance_save)
        self.font_size_fixo.valueChanged.connect(self._schedule_appearance_save)
        layout.addWidget(grp_appearance)

        grp_notification = QGroupBox("Notificacao")
        notification_layout = QVBoxLayout(grp_notification)
        notification_layout.setContentsMargins(14, GROUP_INNER_TOP, 14, 14)
        notification_layout.setSpacing(ROW_GAP)

        self.sound_enabled = QCheckBox("Ativar som de notificacao")
        self.sound_enabled.setChecked(SOUND_ENABLED_DEFAULT)
        self.sound_enabled.toggled.connect(self._on_sound_enabled_toggled)

        self.sound_interval = QComboBox()
        self.sound_interval.setFixedHeight(FIELD_HEIGHT)
        self.sound_interval.setMinimumWidth(180)
        for seconds in SOUND_INTERVALS:
            if seconds == 0:
                self.sound_interval.addItem("A cada mensagem", 0)
            else:
                self.sound_interval.addItem(f"{seconds} segundos", seconds)
        self.sound_interval.setCurrentIndex(0)
        self.sound_interval.currentIndexChanged.connect(self._schedule_appearance_save)

        interval_row = QWidget()
        interval_row.setObjectName("space-between-row")
        interval_row.setLayout(
            self._space_between_row("Intervalo minimo:", self.sound_interval, input_width=180)
        )

        notification_layout.addWidget(self.sound_enabled)
        notification_layout.addWidget(interval_row)
        layout.addWidget(grp_notification)

        # Portas
        grp_port = QGroupBox("Porta do servidor")
        port_layout = QHBoxLayout(grp_port)
        port_layout.setContentsMargins(14, GROUP_INNER_TOP, 14, 14)
        port_layout.setSpacing(12)
        self.port_group = QButtonGroup(self)

        for port in PORTS:
            col = QVBoxLayout()
            rb = QRadioButton(str(port))
            rb.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
            st = QLabel("...")
            st.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.port_radios[port] = rb
            self.port_status_labels[port] = st
            self.port_group.addButton(rb)
            col.addWidget(rb)
            col.addWidget(st)
            port_layout.addLayout(col)

        self.port_group.buttonClicked.connect(self._update_urls)
        layout.addWidget(grp_port)

        # URLs OBS
        grp_obs = QGroupBox("URL para o OBS")
        obs_layout = QVBoxLayout(grp_obs)
        obs_layout.setContentsMargins(14, GROUP_INNER_TOP, 14, 14)
        obs_layout.setSpacing(ROW_GAP)

        lbl1 = QLabel("Overlay transparente, fica sobre a tela do jogo, usuários conseguem ver as mensagens")
        lbl1.setObjectName("url_label")
        lbl1.setWordWrap(True)
        self.url_normal = QLineEdit()
        self.url_normal.setReadOnly(True)
        self._prepare_field(self.url_normal)
        row1 = QHBoxLayout()
        row1.setSpacing(10)
        row1.addWidget(self.url_normal, 1)
        btn_copy1 = QPushButton("Copiar")
        btn_copy1.setFixedHeight(FIELD_HEIGHT)
        btn_copy1.clicked.connect(lambda: self._copy(self.url_normal.text()))
        row1.addWidget(btn_copy1)

        lbl2 = QLabel("Chat fixo, somente o streamer consegue ver, textos somem após 10 minutos")
        lbl2.setObjectName("url_label")
        lbl2.setWordWrap(True)
        self.url_fixo = QLineEdit()
        self.url_fixo.setReadOnly(True)
        self._prepare_field(self.url_fixo)
        row2 = QHBoxLayout()
        row2.setSpacing(10)
        row2.addWidget(self.url_fixo, 1)
        btn_copy2 = QPushButton("Copiar")
        btn_copy2.setFixedHeight(FIELD_HEIGHT)
        btn_copy2.clicked.connect(lambda: self._copy(self.url_fixo.text()))
        row2.addWidget(btn_copy2)

        obs_layout.addWidget(self._obs_block(lbl1, row1))
        obs_layout.addWidget(self._obs_block(lbl2, row2))
        layout.addWidget(grp_obs)

        self.status_label = QLabel("Servidor parado")
        self.status_label.setObjectName("status_idle")
        layout.addWidget(self.status_label)

        # Botoes
        btn_row = QHBoxLayout()
        self.btn_save = QPushButton("Salvar")
        self.btn_save.setObjectName("primary")
        self.btn_start = QPushButton("Iniciar")
        self.btn_stop = QPushButton("Parar")
        self.btn_overlay = QPushButton("Abrir Overlay")

        self.btn_save.clicked.connect(self._save)
        self.btn_start.clicked.connect(self._start)
        self.btn_stop.clicked.connect(self._stop)
        self.btn_overlay.clicked.connect(self._open_overlay)

        btn_row.addWidget(self.btn_save)
        btn_row.addWidget(self.btn_start)
        btn_row.addWidget(self.btn_stop)
        btn_row.addWidget(self.btn_overlay)
        layout.addLayout(btn_row)

        hint = QLabel("Apos salvar ou mudar a porta, reinicie com Iniciar.")
        hint.setObjectName("subtitle")
        hint.setWordWrap(True)
        layout.addWidget(hint)
        layout.addStretch(0)

    def _selected_port(self) -> int:
        for port, rb in self.port_radios.items():
            if rb.isChecked():
                return port
        return PORTS[0]

    def _update_urls(self):
        port = self._selected_port()
        self.url_normal.setText(f"http://localhost:{port}/overlaypublico")
        self.url_fixo.setText(f"http://localhost:{port}/chatfixostremer")

    def _schedule_appearance_save(self) -> None:
        self._font_save_timer.start()

    def _on_sound_enabled_toggled(self, enabled: bool) -> None:
        self.sound_interval.setEnabled(enabled)
        self._schedule_appearance_save()

    def _selected_sound_interval(self) -> int:
        value = self.sound_interval.currentData()
        return parse_sound_interval(value)

    def _save_appearance_live(self) -> None:
        cfg = read_env()
        cfg["OVERLAY_FONT_SIZE"] = str(self.font_size.value())
        cfg["OVERLAY_FONT_SIZE_FIXO"] = str(self.font_size_fixo.value())
        cfg["NOTIFICATION_SOUND_ENABLED"] = "1" if self.sound_enabled.isChecked() else "0"
        cfg["NOTIFICATION_SOUND_INTERVAL"] = str(self._selected_sound_interval())
        try:
            write_env(cfg)
        except Exception:
            return
        self._push_appearance_to_server()

    def _push_appearance_to_server(self) -> None:
        port = self._selected_port()
        body = json.dumps(
            {
                "OVERLAY_FONT_SIZE": str(self.font_size.value()),
                "OVERLAY_FONT_SIZE_FIXO": str(self.font_size_fixo.value()),
                "NOTIFICATION_SOUND_ENABLED": "1" if self.sound_enabled.isChecked() else "0",
                "NOTIFICATION_SOUND_INTERVAL": str(self._selected_sound_interval()),
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/overlay-appearance",
            data=body,
            headers={"Content-Type": "application/json"},
            method="PATCH",
        )
        try:
            urllib.request.urlopen(req, timeout=2)
        except (urllib.error.URLError, TimeoutError, OSError):
            pass

    def _load_config(self):
        cfg = read_env()
        self.twitch.setText(cfg["TWITCH_CHANNEL"])
        self.kick.setText(cfg["KICK_CHANNEL"])
        self.yt_channel.setText(cfg["YOUTUBE_CHANNEL"])
        self.yt_video.setText(cfg["YOUTUBE_VIDEO_ID"])

        try:
            font_size = int(cfg.get("OVERLAY_FONT_SIZE", str(FONT_SIZE_DEFAULT)))
        except ValueError:
            font_size = FONT_SIZE_DEFAULT
        self.font_size.blockSignals(True)
        self.font_size.setValue(max(FONT_SIZE_MIN, min(FONT_SIZE_MAX, font_size)))
        self.font_size.blockSignals(False)

        try:
            font_size_fixo = int(cfg.get("OVERLAY_FONT_SIZE_FIXO", str(FONT_SIZE_FIXO_DEFAULT)))
        except ValueError:
            font_size_fixo = FONT_SIZE_FIXO_DEFAULT
        self.font_size_fixo.blockSignals(True)
        self.font_size_fixo.setValue(max(FONT_SIZE_MIN, min(FONT_SIZE_MAX, font_size_fixo)))
        self.font_size_fixo.blockSignals(False)

        sound_on = parse_sound_enabled(cfg.get("NOTIFICATION_SOUND_ENABLED", "1"))
        sound_interval = parse_sound_interval(cfg.get("NOTIFICATION_SOUND_INTERVAL", str(SOUND_INTERVAL_DEFAULT)))
        self.sound_enabled.blockSignals(True)
        self.sound_enabled.setChecked(sound_on)
        self.sound_enabled.blockSignals(False)
        self.sound_interval.blockSignals(True)
        idx = self.sound_interval.findData(sound_interval)
        self.sound_interval.setCurrentIndex(idx if idx >= 0 else 0)
        self.sound_interval.setEnabled(sound_on)
        self.sound_interval.blockSignals(False)

        port = int(cfg.get("PORT", "3847"))
        if port in self.port_radios:
            self.port_radios[port].setChecked(True)
        else:
            self.port_radios[PORTS[0]].setChecked(True)
        self._update_urls()

    def _refresh_ports(self):
        selected = self._selected_port()
        for port in PORTS:
            rb = self.port_radios[port]
            st = self.port_status_labels[port]
            in_use = port_in_use(port)

            if in_use and port == selected:
                self._set_label_state(st, "Ativa", "port_active")
                rb.setEnabled(True)
            elif in_use:
                self._set_label_state(st, "Em uso", "port_busy")
                rb.setEnabled(False)
                if rb.isChecked():
                    for p, r in self.port_radios.items():
                        if p != port and not port_in_use(p):
                            r.setChecked(True)
                            break
            else:
                self._set_label_state(st, "Livre", "port_free")
                rb.setEnabled(True)

        self._update_urls()
        self._update_server_status()

    def _update_server_status(self):
        port = self._selected_port()
        if port_in_use(port):
            self._set_label_state(
                self.status_label,
                f"Servidor rodando na porta {port}",
                "status_ok",
            )
        else:
            self._set_label_state(self.status_label, "Servidor parado", "status_idle")

    def _on_timer(self):
        self._refresh_ports()

    def _copy(self, text: str):
        QGuiApplication.clipboard().setText(text)
        self._set_label_state(self.status_label, "URL copiada!", "status_ok")

    def _collect_config(self) -> dict:
        cfg = read_env()
        cfg.update(
            {
                "PORT": str(self._selected_port()),
                "TWITCH_CHANNEL": self.twitch.text().strip(),
                "KICK_CHANNEL": self.kick.text().strip(),
                "YOUTUBE_CHANNEL": self.yt_channel.text().strip(),
                "YOUTUBE_VIDEO_ID": self.yt_video.text().strip(),
                "OVERLAY_FONT_SIZE": str(self.font_size.value()),
                "OVERLAY_FONT_SIZE_FIXO": str(self.font_size_fixo.value()),
                "NOTIFICATION_SOUND_ENABLED": "1" if self.sound_enabled.isChecked() else "0",
                "NOTIFICATION_SOUND_INTERVAL": str(self._selected_sound_interval()),
            }
        )
        return cfg

    def _save(self):
        try:
            write_env(self._collect_config())
            self._update_urls()
            QMessageBox.information(
                self,
                "Meu Multichat",
                "Configuracao salva!\n\nReinicie o servidor (Parar + Iniciar) para aplicar canais e porta.\nFonte e notificacao atualizam no overlay em ate 10 segundos.",
            )
        except Exception as e:
            QMessageBox.critical(self, "Erro", str(e))

    def _start(self):
        try:
            write_env(self._collect_config())
            stop_all_servers()
            QTimer.singleShot(400, self._start_node)

        except Exception as e:
            QMessageBox.critical(self, "Erro", str(e))

    def _start_node(self):
        self._server_proc = start_server()
        QTimer.singleShot(1000, self._refresh_ports)

    def _stop(self):
        if self._server_proc and self._server_proc.poll() is None:
            stop_process_tree(self._server_proc.pid)
            self._server_proc = None
        stop_all_servers()
        QTimer.singleShot(300, self._refresh_ports)

    def _open_overlay(self):
        port = self._selected_port()
        os.startfile(f"http://localhost:{port}/overlaypublico?preview=1")


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setStyleSheet(STYLESHEET)
    window = MainWindow()
    app.aboutToQuit.connect(window._cleanup_processes)
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
