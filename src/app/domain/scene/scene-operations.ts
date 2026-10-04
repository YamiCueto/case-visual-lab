import { CURRENT_SCENE_SCHEMA_VERSION, SceneDocument } from './scene-document';

export function createEmptyScene(title = 'Nuevo Canvas'): SceneDocument {
  const now = new Date().toISOString();
  const id = 'scene_' + Math.random().toString(36).substring(2, 10);
  return {
    schemaVersion: CURRENT_SCENE_SCHEMA_VERSION,
    id,
    title,
    createdAt: now,
    updatedAt: now,
    elements: [],
    appState: { viewBackgroundColor: '#000000', currentItemFontFamily: 1 },
    files: {},
  };
}

export function duplicateScene(original: SceneDocument, newTitle?: string): SceneDocument {
  const now = new Date().toISOString();
  const id = 'scene_' + Math.random().toString(36).substring(2, 10);
  return {
    ...original,
    id,
    title: newTitle ?? `${original.title} (Copia)`,
    createdAt: now,
    updatedAt: now,
  };
}

export function touchScene(
  scene: SceneDocument,
  updates: Partial<Pick<SceneDocument, 'elements' | 'appState' | 'files' | 'title'>>,
): SceneDocument {
  return {
    ...scene,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates the starter living playground scene:
 * A clean distributed architecture (Client -> API Gateway -> Order Service / Auth -> Database)
 * ready to explore and interact with immediately.
 */
export function createStarterPlaygroundScene(): SceneDocument {
  const now = new Date().toISOString();
  const id = 'starter_playground';

  // Vector elements for the living HTTP architecture
  const elements: unknown[] = [
    // 1. Client Node
    {
      id: 'node_client',
      type: 'rectangle',
      x: 60,
      y: 180,
      width: 140,
      height: 70,
      strokeColor: '#00F2FE',
      backgroundColor: '#071A21',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 0,
      roundness: { type: 3 },
      isDeleted: false,
    },
    {
      id: 'text_client',
      type: 'text',
      x: 75,
      y: 200,
      width: 110,
      height: 30,
      text: 'Client (Web)',
      fontSize: 16,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      strokeColor: '#FFFFFF',
      backgroundColor: 'transparent',
      isDeleted: false,
    },

    // Arrow 1: Client -> Gateway
    {
      id: 'arrow_client_gw',
      type: 'arrow',
      x: 200,
      y: 215,
      width: 90,
      height: 0,
      points: [
        [0, 0],
        [90, 0],
      ],
      strokeColor: '#00F2FE',
      backgroundColor: 'transparent',
      strokeWidth: 2,
      roughness: 0,
      startArrowhead: null,
      endArrowhead: 'arrow',
      isDeleted: false,
    },
    {
      id: 'label_http',
      type: 'text',
      x: 205,
      y: 188,
      width: 80,
      height: 20,
      text: 'HTTP / POST',
      fontSize: 11,
      fontFamily: 3,
      strokeColor: '#9AA3AE',
      backgroundColor: 'transparent',
      isDeleted: false,
    },

    // 2. API Gateway Node
    {
      id: 'node_gateway',
      type: 'rectangle',
      x: 290,
      y: 160,
      width: 160,
      height: 110,
      strokeColor: '#6D5DFC',
      backgroundColor: '#13112A',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 0,
      roundness: { type: 3 },
      isDeleted: false,
    },
    {
      id: 'text_gateway_title',
      type: 'text',
      x: 305,
      y: 175,
      width: 130,
      height: 25,
      text: 'API Gateway',
      fontSize: 18,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      strokeColor: '#FFFFFF',
      backgroundColor: 'transparent',
      isDeleted: false,
    },
    {
      id: 'text_gateway_sub',
      type: 'text',
      x: 305,
      y: 210,
      width: 130,
      height: 40,
      text: '• Auth & Token\n• Rate Limiting',
      fontSize: 12,
      fontFamily: 1,
      textAlign: 'center',
      strokeColor: '#9AA3AE',
      backgroundColor: 'transparent',
      isDeleted: false,
    },

    // Arrow 2: Gateway -> Order Service
    {
      id: 'arrow_gw_service',
      type: 'arrow',
      x: 450,
      y: 215,
      width: 90,
      height: 0,
      points: [
        [0, 0],
        [90, 0],
      ],
      strokeColor: '#6D5DFC',
      backgroundColor: 'transparent',
      strokeWidth: 2,
      roughness: 0,
      startArrowhead: null,
      endArrowhead: 'arrow',
      isDeleted: false,
    },
    {
      id: 'label_grpc',
      type: 'text',
      x: 460,
      y: 188,
      width: 70,
      height: 20,
      text: 'gRPC / JSON',
      fontSize: 11,
      fontFamily: 3,
      strokeColor: '#9AA3AE',
      backgroundColor: 'transparent',
      isDeleted: false,
    },

    // 3. Order Service Node
    {
      id: 'node_service',
      type: 'rectangle',
      x: 540,
      y: 160,
      width: 160,
      height: 110,
      strokeColor: '#00F2FE',
      backgroundColor: '#071A21',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 0,
      roundness: { type: 3 },
      isDeleted: false,
    },
    {
      id: 'text_service_title',
      type: 'text',
      x: 555,
      y: 175,
      width: 130,
      height: 25,
      text: 'Order Service',
      fontSize: 18,
      fontFamily: 1,
      textAlign: 'center',
      strokeColor: '#FFFFFF',
      backgroundColor: 'transparent',
      isDeleted: false,
    },
    {
      id: 'text_service_sub',
      type: 'text',
      x: 555,
      y: 210,
      width: 130,
      height: 40,
      text: '• Domain Entities\n• Use Cases (CQRS)',
      fontSize: 12,
      fontFamily: 1,
      textAlign: 'center',
      strokeColor: '#9AA3AE',
      backgroundColor: 'transparent',
      isDeleted: false,
    },

    // Arrow 3: Service -> Database
    {
      id: 'arrow_service_db',
      type: 'arrow',
      x: 700,
      y: 215,
      width: 90,
      height: 0,
      points: [
        [0, 0],
        [90, 0],
      ],
      strokeColor: '#00E599',
      backgroundColor: 'transparent',
      strokeWidth: 2,
      roughness: 0,
      startArrowhead: null,
      endArrowhead: 'arrow',
      isDeleted: false,
    },

    // 4. Database Node
    {
      id: 'node_db',
      type: 'rectangle',
      x: 790,
      y: 170,
      width: 150,
      height: 90,
      strokeColor: '#00E599',
      backgroundColor: '#091F14',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 0,
      roundness: { type: 3 },
      isDeleted: false,
    },
    {
      id: 'text_db_title',
      type: 'text',
      x: 805,
      y: 190,
      width: 120,
      height: 25,
      text: 'PostgreSQL',
      fontSize: 17,
      fontFamily: 1,
      textAlign: 'center',
      strokeColor: '#FFFFFF',
      backgroundColor: 'transparent',
      isDeleted: false,
    },
    {
      id: 'text_db_sub',
      type: 'text',
      x: 805,
      y: 220,
      width: 120,
      height: 25,
      text: 'Primary (WAL)',
      fontSize: 12,
      fontFamily: 3,
      textAlign: 'center',
      strokeColor: '#9AA3AE',
      backgroundColor: 'transparent',
      isDeleted: false,
    },

    // Header Annotation Note
    {
      id: 'note_header',
      type: 'text',
      x: 60,
      y: 100,
      width: 480,
      height: 35,
      text: 'CASE Visual Lab · Interactive Living Playground',
      fontSize: 22,
      fontFamily: 1,
      strokeColor: '#00F2FE',
      backgroundColor: 'transparent',
      isDeleted: false,
    },
    {
      id: 'note_desc',
      type: 'text',
      x: 60,
      y: 135,
      width: 600,
      height: 20,
      text: 'Mueve los nodos, haz doble clic para editar o presiona "Simular Petición" para ver el flujo animado.',
      fontSize: 13,
      fontFamily: 1,
      strokeColor: '#9AA3AE',
      backgroundColor: 'transparent',
      isDeleted: false,
    },
  ];

  return {
    schemaVersion: CURRENT_SCENE_SCHEMA_VERSION,
    id,
    title: 'HTTP Request Flow (Playground)',
    createdAt: now,
    updatedAt: now,
    elements,
    appState: {
      viewBackgroundColor: '#000000',
      currentItemFontFamily: 1,
    },
    files: {},
  };
}
