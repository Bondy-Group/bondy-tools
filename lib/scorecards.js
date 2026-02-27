// Scorecards por cliente
// Cada scorecard tiene: id, name, skills con peso y preguntas asociadas

export const SCORECARDS = {
  IOL: {
    id: 'IOL',
    name: 'IOL (Invertir Online)',
    totalWeight: 100,
    skills: [
      {
        id: 'python',
        name: 'Python & Ecosystem',
        weight: 20,
        description: 'Dominio de Python, librerías del ecosistema, buenas prácticas y patrones',
        questions: [
          'Describí tu experiencia con Python. ¿Cuánto tiempo llevás usándolo y en qué tipo de proyectos?',
          '¿Qué librerías del ecosistema Python manejás con más profundidad?',
          '¿Cómo manejás la gestión de dependencias y entornos virtuales?',
        ],
      },
      {
        id: 'data_engineering',
        name: 'Data Engineering',
        weight: 18,
        description: 'Pipelines de datos, ETL/ELT, procesamiento batch y streaming',
        questions: [
          '¿Tenés experiencia diseñando o manteniendo pipelines de datos? Contame un ejemplo.',
          '¿Con qué herramientas de orquestación trabajaste (Airflow, Prefect, Luigi, etc.)?',
          '¿Cómo manejás la calidad y validación de datos en un pipeline?',
        ],
      },
      {
        id: 'sql_databases',
        name: 'SQL & Bases de Datos',
        weight: 15,
        description: 'Queries complejos, optimización, modelado de datos, bases relacionales y NoSQL',
        questions: [
          '¿Qué bases de datos relacionales usaste con mayor profundidad?',
          '¿Podés describir un caso donde tuviste que optimizar una query compleja?',
          '¿Tenés experiencia con bases NoSQL? ¿En qué contextos las usaste?',
        ],
      },
      {
        id: 'apis_backend',
        name: 'APIs & Backend',
        weight: 12,
        description: 'Diseño y desarrollo de APIs REST/GraphQL, frameworks backend',
        questions: [
          '¿Con qué frameworks backend trabajaste? (FastAPI, Django, Flask, etc.)',
          '¿Cómo diseñás una API REST? ¿Qué principios seguís?',
          '¿Tenés experiencia con autenticación y autorización en APIs?',
        ],
      },
      {
        id: 'cloud_infra',
        name: 'Cloud & Infraestructura',
        weight: 12,
        description: 'AWS/GCP/Azure, contenedores, CI/CD, infraestructura como código',
        questions: [
          '¿Qué plataformas cloud usaste y con qué profundidad?',
          '¿Tenés experiencia con Docker y/o Kubernetes?',
          '¿Cómo es tu experiencia con CI/CD? ¿Qué herramientas usaste?',
        ],
      },
      {
        id: 'problem_solving',
        name: 'Problem Solving & Arquitectura',
        weight: 10,
        description: 'Capacidad de resolución de problemas complejos, pensamiento sistémico y decisiones de arquitectura',
        questions: [
          'Contame de un problema técnico complejo que hayas resuelto recientemente.',
          '¿Cómo tomás decisiones de arquitectura cuando hay múltiples opciones?',
          '¿Qué considerás al diseñar un sistema que necesita escalar?',
        ],
      },
      {
        id: 'collaboration',
        name: 'Trabajo en Equipo & Comunicación',
        weight: 8,
        description: 'Capacidad de colaboración, comunicación técnica y trabajo en equipos multidisciplinarios',
        questions: [
          '¿Cómo es tu experiencia trabajando en equipos ágiles?',
          '¿Cómo manejás los code reviews? ¿Qué valorás en ese proceso?',
          '¿Cómo comunicás decisiones técnicas a personas no técnicas?',
        ],
      },
      {
        id: 'ownership',
        name: 'Ownership & Proactividad',
        weight: 5,
        description: 'Sentido de pertenencia sobre el producto, iniciativa y motivación intrínseca',
        questions: [
          '¿Podés darme un ejemplo donde tomaste iniciativa sin que te lo pidieran?',
          '¿Cómo te mantenés actualizado técnicamente?',
          '¿Qué te atrae específicamente de este rol?',
        ],
      },
    ],
  },
  GENERIC: {
    id: 'GENERIC',
    name: 'Scorecard Genérico',
    totalWeight: 100,
    skills: [
      {
        id: 'technical_skills',
        name: 'Habilidades Técnicas',
        weight: 30,
        description: 'Dominio del stack técnico requerido para el rol',
        questions: [
          '¿Cuál es tu experiencia con las tecnologías principales del rol?',
          '¿Podés describir un proyecto técnico desafiante que hayas liderado o participado?',
        ],
      },
      {
        id: 'problem_solving',
        name: 'Problem Solving',
        weight: 20,
        description: 'Capacidad analítica y resolución de problemas complejos',
        questions: [
          'Contame de un problema difícil que hayas resuelto. ¿Cómo lo encaraste?',
          '¿Cómo priorizás cuando tenés múltiples problemas al mismo tiempo?',
        ],
      },
      {
        id: 'communication',
        name: 'Comunicación',
        weight: 15,
        description: 'Claridad, escucha activa y comunicación efectiva',
        questions: [
          '¿Cómo explicarías un concepto técnico complejo a alguien sin background técnico?',
          '¿Podés darme un ejemplo de una situación de conflicto y cómo lo resolviste?',
        ],
      },
      {
        id: 'collaboration',
        name: 'Trabajo en Equipo',
        weight: 15,
        description: 'Capacidad de colaboración y trabajo en equipo',
        questions: [
          '¿Cómo es tu experiencia trabajando en equipos ágiles?',
          '¿Cómo manejás el feedback y los code reviews?',
        ],
      },
      {
        id: 'ownership',
        name: 'Ownership & Motivación',
        weight: 10,
        description: 'Proactividad, sentido de pertenencia y motivación',
        questions: [
          '¿Por qué te interesa este rol específicamente?',
          '¿Podés darme un ejemplo de cuando tomaste iniciativa más allá de tu rol?',
        ],
      },
      {
        id: 'adaptability',
        name: 'Adaptabilidad',
        weight: 10,
        description: 'Capacidad de aprendizaje y adaptación a nuevos contextos',
        questions: [
          '¿Cómo te actualizás tecnológicamente?',
          '¿Podés contarme de un momento donde tuviste que adaptarte a un cambio grande?',
        ],
      },
    ],
  },
}

export const SCORECARD_LIST = [
  { id: 'NONE', name: '— Sin scorecard —' },
  { id: 'IOL', name: 'IOL (Invertir Online)' },
  { id: 'GENERIC', name: 'Scorecard Genérico' },
]

// Calcular score final ponderado (0-100)
export function calculateWeightedScore(ratings, scorecard) {
  if (!scorecard || !ratings) return null
  let totalScore = 0
  let totalWeight = 0
  for (const skill of scorecard.skills) {
    const rating = ratings[skill.id]
    if (rating !== undefined && rating !== null && rating > 0) {
      // Rating es 1-5, normalizamos a 0-100
      const normalizedRating = ((rating - 1) / 4) * 100
      totalScore += normalizedRating * (skill.weight / 100)
      totalWeight += skill.weight
    }
  }
  if (totalWeight === 0) return null
  // Ajustar si no se evaluaron todos los skills
  return Math.round(totalScore * (100 / totalWeight))
}

// Obtener label del score final
export function getScoreLabel(score) {
  if (score === null) return null
  if (score >= 85) return { label: 'Excelente candidato/a', color: '#22c55e', emoji: '🌟' }
  if (score >= 70) return { label: 'Buen candidato/a', color: '#84cc16', emoji: '✅' }
  if (score >= 55) return { label: 'Candidato/a con potencial', color: '#f59e0b', emoji: '⚠️' }
  return { label: 'No recomendado/a', color: '#ef4444', emoji: '❌' }
}
