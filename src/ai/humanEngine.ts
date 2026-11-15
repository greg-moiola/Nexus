
import * as H from '@vladmandic/human'

export interface DetectedExpression {
  expression: string
  confidence: number
}

export interface DetectedFace {
  expressions: DetectedExpression[]
  mainExpression: string | null
  confidence: number
  box: [number, number, number, number] | null
}

export interface ImageAnalysisResult {
  faceCount: number
  faces: DetectedFace[]
}

interface HumanDetectionResult {
  face?: Array<{
    box?: number[]
    emotion?: Array<{
      emotion: string
      score: number
    }>
  }>
}

const humanConfig: Partial<H.Config> = {
  backend: 'webgl',
  modelBasePath: '/models/',
  cacheModels: true,

  filter: {
    enabled: true,
    equalization: true,
  },

  face: {
    enabled: true,

    detector: {
      modelPath: 'blazeface.json',

      // Correzione per volti ruotati o inclinati
      rotation: true,

      // Consente di rilevare più persone
      maxDetected: 10,

      // Soglia leggermente più permissiva
      // per non perdere volti meno evidenti
      minConfidence: 0.12,

      minSize: 20,
    },

    mesh: {
      enabled: false,
    },

    attention: {
      enabled: false,
    },

    iris: {
      enabled: false,
    },

    description: {
      enabled: false,
    },

    emotion: {
      enabled: true,
      modelPath: 'emotion.json',
      minConfidence: 0.1,
    },
  },

  body: {
    enabled: false,
  },

  hand: {
    enabled: false,
  },

  object: {
    enabled: false,
  },

  segmentation: {
    enabled: false,
  },

  gesture: {
    enabled: false,
  },
}

let humanInstance: H.Human | null = null
let loadingPromise: Promise<void> | null = null

export async function initializeHumanEngine(): Promise<void> {
  if (humanInstance) return

  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const engine = new H.Human(humanConfig)

    await engine.load()

    humanInstance = engine
  })()

  try {
    await loadingPromise
  } catch (error) {
    humanInstance = null
    loadingPromise = null

    throw error
  }
}

export async function analyzeImage(
  input: HTMLImageElement | HTMLCanvasElement,
): Promise<ImageAnalysisResult> {
  if (!humanInstance) {
    await initializeHumanEngine()
  }

  if (!humanInstance) {
    throw new Error('Il motore IA non è stato inizializzato.')
  }

  const result = (
    await humanInstance.detect(input)
  ) as unknown as HumanDetectionResult

  const detectedFaces = result.face ?? []

  const faces: DetectedFace[] = detectedFaces.map((face) => {
    const expressions = (face.emotion ?? [])
      .map((item) => ({
        expression: item.emotion,
        confidence: Math.round(item.score * 100),
      }))
      .sort((a, b) => b.confidence - a.confidence)

    const rawBox = face.box

    const box =
      rawBox && rawBox.length >= 4
        ? ([
            rawBox[0],
            rawBox[1],
            rawBox[2],
            rawBox[3],
          ] as [number, number, number, number])
        : null

    const confidence = expressions[0]?.confidence ?? 0

    // Evitiamo di presentare una classificazione debole
    // come se fosse una previsione attendibile.
    const mainExpression =
      confidence >= 45
        ? expressions[0]?.expression ?? null
        : null

    return {
      expressions,
      mainExpression,
      confidence,
      box,
    }
  })

  return {
    faceCount: faces.length,
    faces,
  }
}

export function isHumanEngineReady(): boolean {
  return humanInstance !== null
}
