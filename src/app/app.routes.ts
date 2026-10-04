import { Routes } from '@angular/router';
import { ShellComponent } from './presentation/layout/shell/shell.component';

/** Every feature is lazy-loaded so the initial bundle stays small as content grows. */
export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Inicio · CASE Visual Lab',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'lessons',
        title: 'Lecciones · CASE Visual Lab',
        loadComponent: () => import('./features/lessons/lessons.page').then((m) => m.LessonsPage),
      },
      {
        path: 'templates',
        title: 'Plantillas · CASE Visual Lab',
        loadComponent: () =>
          import('./features/templates/templates.page').then((m) => m.TemplatesPage),
      },
      {
        path: 'examples',
        title: 'Ejemplos · CASE Visual Lab',
        loadComponent: () =>
          import('./features/examples/examples.page').then((m) => m.ExamplesPage),
      },
      {
        path: 'canvas',
        title: 'Canvas · CASE Visual Lab',
        loadComponent: () => import('./features/canvas/canvas.page').then((m) => m.CanvasPage),
      },
      {
        path: 'workspace',
        redirectTo: 'canvas',
      },
      {
        path: 'philosophy',
        title: 'Filosofía · CASE Visual Lab',
        loadComponent: () =>
          import('./features/philosophy/philosophy.page').then((m) => m.PhilosophyPage),
      },
      {
        path: 'settings',
        title: 'Ajustes · CASE Visual Lab',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'about',
        title: 'Acerca de · CASE Visual Lab',
        loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
