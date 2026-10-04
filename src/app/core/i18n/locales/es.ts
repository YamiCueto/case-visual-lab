export const es = {
  'app.name': 'CASE Visual Lab',
  'app.tagline': 'Architecture, AI and Systems — Drawn.',
  'nav.dashboard': 'Inicio',
  'nav.lessons': 'Lecciones',
  'nav.templates': 'Plantillas',
  'nav.examples': 'Ejemplos',
  'nav.canvas': 'Canvas',
  'nav.philosophy': 'Filosofía',
  'nav.settings': 'Ajustes',
  'nav.about': 'Acerca de',
  'nav.menu': 'Abrir navegación',
  'common.comingSoon': 'Disponible en próximos sprints.',
  'dashboard.title': 'CASE Visual Lab',
  'dashboard.subtitle': 'Architecture, AI and Systems — Drawn.',
  'dashboard.tagline': 'Draw. Explore. Understand.',
  'dashboard.manifestoPreview':
    'El software es más fácil de entender cuando se vuelve visual. La arquitectura no se memoriza: se explora.',
  'dashboard.manifestoCta': 'Leer el Manifiesto →',
  'lessons.title': 'Lecciones',
  'lessons.subtitle': 'Rutas guiadas paso a paso sobre arquitectura e IA.',
  'templates.title': 'Plantillas',
  'templates.subtitle': 'Puntos de partida reutilizables para tus diagramas.',
  'examples.title': 'Ejemplos',
  'examples.subtitle': 'Diagramas de referencia listos para explorar.',
  'canvas.title': 'Canvas',
  'canvas.subtitle':
    'Pensar dibujando. Lienzo interactivo donde los conceptos de ingeniería cobran vida. El motor gráfico se integrará en el Sprint 1.',
  'philosophy.title': 'Filosofía',
  'philosophy.subtitle':
    'El ADN de CASE Visual Lab: transformar conceptos complejos de ingeniería en experiencias visuales interactivas.',
  'philosophy.manifesto.title': 'El Manifiesto de CASE Visual Lab',
  'philosophy.beliefs.title': 'Lo que creemos',
  'settings.title': 'Ajustes',
  'settings.subtitle': 'Preferencias guardadas localmente en tu navegador.',
  'settings.theme': 'Tema',
  'settings.theme.oled': 'Oscuro OLED',
  'settings.theme.light': 'Claro',
  'settings.language': 'Idioma',
  'settings.reducedMotion': 'Reducir animaciones',
  'settings.reset': 'Restablecer',
  'about.title': 'Acerca de',
  'about.subtitle':
    'CASE Visual Lab · Visual Learning Platform for Software Engineering. Motor visual del ecosistema CASE OS.',
  'about.disclaimer':
    'Este proyecto utiliza el paquete open source @excalidraw/excalidraw (licencia MIT). No está afiliado, patrocinado ni respaldado por Excalidraw.',
  'about.license': 'Licencia MIT. Consulta LICENSE y THIRD_PARTY_NOTICES.md en el repositorio.',
} as const;

export type TranslationKey = keyof typeof es;
export type Dictionary = Readonly<Record<TranslationKey, string>>;
