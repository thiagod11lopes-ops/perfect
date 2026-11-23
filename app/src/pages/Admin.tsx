import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addAdminInstaHandle,
  clearAdminInstaHandles,
  clearAdminVideo,
  getAdminVideo,
  getEffectiveWorkout,
  listTrainingExercises,
  parseYoutubeId,
  removeAdminInstaHandle,
  resetAdminDiets,
  resetAdminWorkouts,
  setAdminInstaHandles,
  setAdminVideo,
  updateAdminDiet,
  updateAdminWorkout,
  type AdminVideoSource,
} from '../data/adminContent'
import { deleteAdminVideoBlob, saveAdminVideoBlob } from '../data/adminVideoDb'
import { resolveExerciseDemo } from '../data/exerciseDemos'
import {
  isValidInstaHandle,
  normalizeInstaHandle,
  readInstaHandlesFromImage,
} from '../data/instaMissionOcr'
import type {
  FoodItem,
  LoadUnit,
  MealPlan,
  WeekDiet,
  WeekWorkout,
  WorkoutBlock,
  WorkoutLetter,
} from '../data/types'
import { useAdminContent } from '../hooks/useAdminContent'

type Tab = 'dietas' | 'treinos' | 'videos' | 'missoes-insta'

function cloneDiet(diet: WeekDiet): WeekDiet {
  return {
    ...diet,
    meals: diet.meals.map((m) => ({
      ...m,
      items: m.items.map((i) => ({ ...i })),
    })),
  }
}

function cloneWorkout(workout: WeekWorkout): WeekWorkout {
  return {
    ...workout,
    blocks: workout.blocks.map((b) => ({ ...b })),
  }
}

function videoLabel(source: AdminVideoSource | null, exercise: string) {
  if (!source) {
    const fallback = resolveExerciseDemo(exercise)
    if (fallback.blobKey) return 'Upload (admin)'
    if (fallback.src) return 'Link padrão'
    if (fallback.youtubeId) return `YouTube padrão · ${fallback.youtubeId}`
    return 'Sem vídeo'
  }
  if (source.blobKey) return `Arquivo · ${source.fileName || source.blobKey}`
  if (source.youtubeId) return `YouTube · ${source.youtubeId}`
  if (source.url) return `Link · ${source.url}`
  return 'Personalizado'
}

function fileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null
  for (const item of data.items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  for (const file of data.files) {
    if (file.type.startsWith('image/')) return file
  }
  return null
}

export function Admin() {
  const content = useAdminContent()
  const [tab, setTab] = useState<Tab>('dietas')
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(1)
  const [letter, setLetter] = useState<WorkoutLetter>('A')
  const [draft, setDraft] = useState<WeekDiet>(() => cloneDiet(content.diets.find((d) => d.week === 1)!))
  const [workoutDraft, setWorkoutDraft] = useState<WeekWorkout>(() =>
    cloneWorkout(getEffectiveWorkout(1, 'A')),
  )
  const [savedFlash, setSavedFlash] = useState('')
  const [videoFilter, setVideoFilter] = useState('')
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({})
  const [busyExercise, setBusyExercise] = useState<string | null>(null)
  const [instaPreview, setInstaPreview] = useState<string | null>(null)
  const [instaBusy, setInstaBusy] = useState(false)
  const [instaProgress, setInstaProgress] = useState(0)
  const [instaStatus, setInstaStatus] = useState('')
  const [instaManual, setInstaManual] = useState('')
  const [instaMerge, setInstaMerge] = useState(true)
  const [instaPasteFlash, setInstaPasteFlash] = useState(false)
  const instaBusyRef = useRef(false)
  const scanInstaImageRef = useRef<(file: File | null) => Promise<void>>(async () => {})
  const dietAutosaveReady = useRef(false)
  const workoutAutosaveReady = useRef(false)

  const exercises = useMemo(() => listTrainingExercises(), [content.workouts])
  const filteredExercises = useMemo(() => {
    const q = videoFilter.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter((name) => name.toLowerCase().includes(q))
  }, [exercises, videoFilter])

  const selectWeek = (w: 1 | 2 | 3 | 4) => {
    setWeek(w)
    setDraft(cloneDiet(content.diets.find((d) => d.week === w)!))
    setWorkoutDraft(cloneWorkout(getEffectiveWorkout(w, letter)))
  }

  const selectLetter = (next: WorkoutLetter) => {
    setLetter(next)
    setWorkoutDraft(cloneWorkout(getEffectiveWorkout(week, next)))
  }

  const flash = (msg: string) => {
    setSavedFlash(msg)
    window.setTimeout(() => setSavedFlash(''), 2200)
  }

  useEffect(() => {
    if (!dietAutosaveReady.current) {
      dietAutosaveReady.current = true
      return
    }
    const timer = window.setTimeout(() => {
      updateAdminDiet(week, draft)
    }, 280)
    return () => window.clearTimeout(timer)
  }, [draft, week])

  useEffect(() => {
    if (!workoutAutosaveReady.current) {
      workoutAutosaveReady.current = true
      return
    }
    const timer = window.setTimeout(() => {
      const normalized: WeekWorkout = {
        ...workoutDraft,
        week,
        letter,
        blocks: workoutDraft.blocks.map((b, i) => ({ ...b, id: i + 1 })),
      }
      updateAdminWorkout(week, letter, normalized)
    }, 280)
    return () => window.clearTimeout(timer)
  }, [workoutDraft, week, letter])

  const updateWorkoutMeta = (patch: Partial<Pick<WeekWorkout, 'phase' | 'days'>>) => {
    setWorkoutDraft((d) => ({ ...d, ...patch }))
  }

  const updateBlock = (index: number, patch: Partial<WorkoutBlock>) => {
    setWorkoutDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }))
  }

  const addBlock = () => {
    setWorkoutDraft((d) => ({
      ...d,
      blocks: [
        ...d.blocks,
        {
          id: d.blocks.length + 1,
          exercise: 'Novo exercício',
          sets: '3 × 10 • força',
          load: '',
          loadUnit: 'kg',
          activeCardio: 'Polichinelos | 2 × 45 s',
          after: '1 min descanso + 3 min esteira',
        },
      ],
    }))
  }

  const removeBlock = (index: number) => {
    setWorkoutDraft((d) => ({
      ...d,
      blocks: d.blocks.filter((_, i) => i !== index).map((b, i) => ({ ...b, id: i + 1 })),
    }))
  }

  const moveBlock = (index: number, dir: -1 | 1) => {
    setWorkoutDraft((d) => {
      const next = [...d.blocks]
      const target = index + dir
      if (target < 0 || target >= next.length) return d
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...d, blocks: next.map((b, i) => ({ ...b, id: i + 1 })) }
    })
  }

  const updateMeal = (mealKey: MealPlan['key'], patch: Partial<MealPlan>) => {
    setDraft((d) => ({
      ...d,
      meals: d.meals.map((m) => (m.key === mealKey ? { ...m, ...patch } : m)),
    }))
  }

  const updateItem = (mealKey: MealPlan['key'], index: number, patch: Partial<FoodItem>) => {
    setDraft((d) => ({
      ...d,
      meals: d.meals.map((m) => {
        if (m.key !== mealKey) return m
        return {
          ...m,
          items: m.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }
      }),
    }))
  }

  const addItem = (mealKey: MealPlan['key']) => {
    setDraft((d) => ({
      ...d,
      meals: d.meals.map((m) =>
        m.key === mealKey
          ? { ...m, items: [...m.items, { name: 'Novo alimento', amount: '0 g' }] }
          : m,
      ),
    }))
  }

  const removeItem = (mealKey: MealPlan['key'], index: number) => {
    setDraft((d) => ({
      ...d,
      meals: d.meals.map((m) =>
        m.key === mealKey
          ? { ...m, items: m.items.filter((_, i) => i !== index) }
          : m,
      ),
    }))
  }

  const saveLink = async (exercise: string) => {
    const raw = (linkDrafts[exercise] ?? '').trim()
    if (!raw) return
    setBusyExercise(exercise)
    try {
      const prev = getAdminVideo(exercise)
      if (prev?.blobKey) {
        try {
          await deleteAdminVideoBlob(prev.blobKey)
        } catch {
          /* ignore */
        }
      }

      const youtubeId = parseYoutubeId(raw)
      if (youtubeId) {
        setAdminVideo(exercise, { youtubeId })
      } else {
        setAdminVideo(exercise, { url: raw })
      }
      setLinkDrafts((d) => ({ ...d, [exercise]: '' }))
      flash(`Vídeo de “${exercise}” atualizado`)
    } finally {
      setBusyExercise(null)
    }
  }

  const saveUpload = async (exercise: string, file: File | null) => {
    if (!file) return
    setBusyExercise(exercise)
    try {
      const prev = getAdminVideo(exercise)
      if (prev?.blobKey) {
        try {
          await deleteAdminVideoBlob(prev.blobKey)
        } catch {
          /* ignore */
        }
      }
      const blobKey = `video:${exercise}`
      await saveAdminVideoBlob(blobKey, file)
      setAdminVideo(exercise, { blobKey, fileName: file.name })
      flash(`Arquivo de “${exercise}” carregado`)
    } catch {
      flash('Falha ao carregar o arquivo de vídeo')
    } finally {
      setBusyExercise(null)
    }
  }

  const resetVideo = async (exercise: string) => {
    setBusyExercise(exercise)
    try {
      await clearAdminVideo(exercise)
      flash(`Vídeo de “${exercise}” voltou ao padrão`)
    } finally {
      setBusyExercise(null)
    }
  }

  const scanInstaImage = async (file: File | null) => {
    if (!file) return
    if (instaBusyRef.current) return
    setInstaPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setInstaBusy(true)
    instaBusyRef.current = true
    setInstaProgress(0)
    setInstaStatus('Preparando leitura…')
    try {
      const { handles, rawText } = await readInstaHandlesFromImage(file, ({ status, progress }) => {
        setInstaStatus(status || 'Lendo…')
        setInstaProgress(Math.round(progress * 100))
      })
      const prev = content.instaMission.handles
      const merged = instaMerge
        ? [...prev, ...handles.filter((h) => !prev.includes(h))]
        : handles
      setAdminInstaHandles(merged, { rawText })
      flash(
        handles.length
          ? `${handles.length} nome(s) lido(s) do print`
          : 'Nenhum @ detectado — confira o print ou adicione manualmente',
      )
    } catch {
      flash('Falha ao ler a imagem. Tente outro print mais nítido.')
    } finally {
      setInstaBusy(false)
      instaBusyRef.current = false
      setInstaStatus('')
      setInstaProgress(0)
    }
  }

  scanInstaImageRef.current = scanInstaImage

  useEffect(() => {
    if (tab !== 'missoes-insta') return

    const onPaste = (e: ClipboardEvent) => {
      if (instaBusyRef.current) return
      const file = fileFromClipboard(e.clipboardData)
      if (!file) return
      e.preventDefault()
      setInstaPasteFlash(true)
      window.setTimeout(() => setInstaPasteFlash(false), 900)
      void scanInstaImageRef.current(file)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [tab])

  const addManualInsta = () => {
    const h = normalizeInstaHandle(instaManual)
    if (!isValidInstaHandle(h)) {
      flash('Handle inválido. Use só letras, números, . e _')
      return
    }
    addAdminInstaHandle(h)
    setInstaManual('')
    flash(`@${h} adicionado`)
  }

  return (
    <div className="admin-shell fade-in">
      <header className="admin-top">
        <div>
          <p className="eyebrow">Painel interno</p>
          <h1 className="display h1" style={{ margin: 0 }}>
            Administração
          </h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Edite dietas, treinos, vídeos e missões Instagram. As mudanças são salvas automaticamente.
          </p>
        </div>
        <Link className="btn btn-ghost" to="/">
          Abrir app
        </Link>
      </header>

      <div className="card admin-controls-card stack-sm">
        <div className="admin-btn-grid admin-tabs" role="tablist" aria-label="Seções do admin">
          <button type="button" className={tab === 'dietas' ? 'active' : ''} onClick={() => setTab('dietas')}>
            Dietas
          </button>
          <button type="button" className={tab === 'treinos' ? 'active' : ''} onClick={() => setTab('treinos')}>
            Treinos
          </button>
          <button type="button" className={tab === 'videos' ? 'active' : ''} onClick={() => setTab('videos')}>
            Vídeos de treino
          </button>
          <button
            type="button"
            className={tab === 'missoes-insta' ? 'active' : ''}
            onClick={() => setTab('missoes-insta')}
          >
            Missões INSTA
          </button>
        </div>

        {tab === 'dietas' ? (
          <div
            className="admin-btn-grid admin-btn-grid-5 admin-controls-toolbar"
            role="group"
            aria-label="Controles de dieta"
          >
            {([1, 2, 3, 4] as const).map((w) => (
              <button
                key={w}
                type="button"
                className={week === w ? 'active' : ''}
                onClick={() => selectWeek(w)}
              >
                Semana {w}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                resetAdminDiets()
                selectWeek(week)
                flash('Dietas restauradas ao padrão')
              }}
            >
              Restaurar padrão
            </button>
          </div>
        ) : null}

        {tab === 'treinos' ? (
          <div
            className="admin-btn-grid admin-btn-grid-4 admin-controls-toolbar"
            role="group"
            aria-label="Controles de treino"
          >
            {([1, 2, 3, 4] as const).map((w) => (
              <button
                key={w}
                type="button"
                className={week === w ? 'active' : ''}
                onClick={() => selectWeek(w)}
              >
                Semana {w}
              </button>
            ))}
            {(['A', 'B', 'C'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={letter === l ? 'active' : ''}
                onClick={() => selectLetter(l)}
              >
                Treino {l}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                resetAdminWorkouts()
                setWorkoutDraft(cloneWorkout(getEffectiveWorkout(week, letter)))
                flash('Treinos restaurados ao padrão')
              }}
            >
              Restaurar padrão
            </button>
          </div>
        ) : null}

        {tab === 'videos' ? (
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="adm-video-filter">Filtrar exercício</label>
            <input
              id="adm-video-filter"
              value={videoFilter}
              onChange={(e) => setVideoFilter(e.target.value)}
              placeholder="Ex.: Supino"
            />
          </div>
        ) : null}

        {tab === 'missoes-insta' ? (
          <div className="admin-controls-toolbar admin-insta-toolbar">
            <p className="muted admin-insta-count">
              {content.instaMission.handles.length} nome(s) na lista
              {content.instaMission.lastScanAt
                ? ` · última leitura ${new Date(content.instaMission.lastScanAt).toLocaleString('pt-BR')}`
                : ''}
            </p>
            <div className="admin-btn-grid admin-btn-grid-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!content.instaMission.handles.length || instaBusy}
                onClick={() => {
                  clearAdminInstaHandles()
                  flash('Lista de missões INSTA limpa')
                }}
              >
                Limpar lista
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {savedFlash ? (
        <p className="admin-flash" role="status">
          {savedFlash}
        </p>
      ) : null}

      {tab === 'dietas' ? (
        <section className="stack admin-panel">
          <div className="card stack form-card">
            <div className="form-row">
              <div className="field">
                <label htmlFor="adm-phase">Fase</label>
                <input
                  id="adm-phase"
                  value={draft.phase}
                  onChange={(e) => setDraft((d) => ({ ...d, phase: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="adm-kcal">Kcal</label>
                <input
                  id="adm-kcal"
                  type="number"
                  min={800}
                  max={4000}
                  value={draft.kcal}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, kcal: Number(e.target.value) || d.kcal }))
                  }
                />
              </div>
            </div>
          </div>

          {draft.meals.map((meal) => (
            <article key={meal.key} className="card stack form-card">
              <div className="form-row">
                <div className="field">
                  <label>Refeição</label>
                  <input
                    value={meal.title}
                    onChange={(e) => updateMeal(meal.key, { title: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Horário</label>
                  <input
                    type="time"
                    value={meal.time}
                    onChange={(e) => updateMeal(meal.key, { time: e.target.value })}
                  />
                </div>
              </div>

              <div className="stack-sm">
                {meal.items.map((item, index) => (
                  <div className="admin-food-row" key={`${meal.key}-${index}`}>
                    <input
                      value={item.name}
                      aria-label="Alimento"
                      onChange={(e) => updateItem(meal.key, index, { name: e.target.value })}
                    />
                    <input
                      value={item.amount}
                      aria-label="Quantidade"
                      onChange={(e) => updateItem(meal.key, index, { amount: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeItem(meal.key, index)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="field">
                <label>Preparo (opcional)</label>
                <textarea
                  rows={2}
                  value={meal.prep ?? ''}
                  onChange={(e) => updateMeal(meal.key, { prep: e.target.value })}
                />
              </div>

              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addItem(meal.key)}>
                + Alimento
              </button>
            </article>
          ))}
        </section>
      ) : null}

      {tab === 'treinos' ? (
        <section className="stack admin-panel">
          <div className="card stack form-card">
            <div className="form-row">
              <div className="field">
                <label htmlFor="adm-w-phase">Fase</label>
                <input
                  id="adm-w-phase"
                  value={workoutDraft.phase}
                  onChange={(e) => updateWorkoutMeta({ phase: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="adm-w-days">Dias</label>
                <input
                  id="adm-w-days"
                  value={workoutDraft.days}
                  onChange={(e) => updateWorkoutMeta({ days: e.target.value })}
                  placeholder="Ex.: Seg / Qui"
                />
              </div>
            </div>
          </div>

          {workoutDraft.blocks.map((block, index) => (
            <article key={`block-${index}`} className="card stack form-card">
              <div className="row-between" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1rem' }}>Bloco {String(index + 1).padStart(2, '0')}</h2>
                <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={index === workoutDraft.blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeBlock(index)}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Exercício</label>
                <input
                  value={block.exercise}
                  onChange={(e) => updateBlock(index, { exercise: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Séries</label>
                <input
                  value={block.sets}
                  onChange={(e) => updateBlock(index, { sets: e.target.value })}
                  placeholder="3 × 10 • força"
                />
              </div>
              <div className="field">
                <label>Carga</label>
                <div className="admin-load-row">
                  <input
                    value={block.load ?? ''}
                    onChange={(e) => updateBlock(index, { load: e.target.value })}
                    placeholder="Ex.: 20"
                    inputMode="decimal"
                  />
                  <div className="admin-load-units" role="group" aria-label="Unidade da carga">
                    {([
                      ['kg', 'KG'],
                      ['placas', 'Placas'],
                    ] as const).map(([unit, label]) => (
                      <button
                        key={unit}
                        type="button"
                        className={(block.loadUnit ?? 'kg') === unit ? 'active' : ''}
                        onClick={() => updateBlock(index, { loadUnit: unit as LoadUnit })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Cardio ativo</label>
                <input
                  value={block.activeCardio}
                  onChange={(e) => updateBlock(index, { activeCardio: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Depois</label>
                <input
                  value={block.after}
                  onChange={(e) => updateBlock(index, { after: e.target.value })}
                />
              </div>
            </article>
          ))}

          <button type="button" className="btn btn-ghost" onClick={addBlock}>
            + Bloco de exercício
          </button>
        </section>
      ) : null}

      {tab === 'missoes-insta' ? (
        <section className="stack admin-panel">
          <p className="muted" style={{ margin: 0 }}>
            Envie um print do Instagram (atividade / seguidores). O sistema lê a imagem e monta a
            lista de @ — como <code>isabellalop3s</code> — para identificar quem aparece na foto.
          </p>

          <article className="card stack form-card">
            <div
              className={`admin-insta-paste${instaPasteFlash ? ' is-pasted' : ''}${instaBusy ? ' is-busy' : ''}`}
              tabIndex={0}
              role="button"
              aria-label="Área para colar print do Instagram com Ctrl+V"
              onPaste={(e) => {
                if (instaBusy) return
                const file = fileFromClipboard(e.clipboardData)
                if (!file) return
                e.preventDefault()
                e.stopPropagation()
                setInstaPasteFlash(true)
                window.setTimeout(() => setInstaPasteFlash(false), 900)
                void scanInstaImage(file)
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('input,label,button,a')) return
                ;(e.currentTarget as HTMLElement).focus()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  document.getElementById('adm-insta-scan')?.click()
                }
              }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="adm-insta-scan">Print do Instagram</label>
                <p className="muted admin-insta-paste-hint">
                  Cole com <kbd>Ctrl</kbd>+<kbd>V</kbd> ou escolha um arquivo
                </p>
                <input
                  id="adm-insta-scan"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  disabled={instaBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    void scanInstaImage(file)
                    e.currentTarget.value = ''
                  }}
                />
              </div>

              <label className="admin-insta-merge">
                <input
                  type="checkbox"
                  checked={instaMerge}
                  disabled={instaBusy}
                  onChange={(e) => setInstaMerge(e.target.checked)}
                />
                Manter nomes já cadastrados e só acrescentar os novos
              </label>

              {instaBusy ? (
                <div className="admin-insta-progress" role="status" aria-live="polite">
                  <div className="admin-insta-progress-bar" style={{ width: `${instaProgress}%` }} />
                  <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                    {instaStatus || 'Lendo imagem…'} · {instaProgress}%
                  </p>
                </div>
              ) : null}

              {instaPreview ? (
                <img
                  className="admin-insta-preview"
                  src={instaPreview}
                  alt="Print enviado para leitura de missões Instagram"
                />
              ) : (
                <p className="admin-insta-paste-empty">Print ainda não colado</p>
              )}
            </div>
          </article>

          <article className="card stack form-card">
            <div className="field">
              <label htmlFor="adm-insta-manual">Adicionar @ manualmente</label>
              <div className="admin-link-row">
                <input
                  id="adm-insta-manual"
                  value={instaManual}
                  placeholder="ex.: isabellalop3s"
                  disabled={instaBusy}
                  onChange={(e) => setInstaManual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addManualInsta()
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={instaBusy || !instaManual.trim()}
                  onClick={addManualInsta}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </article>

          <article className="card stack-sm">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Lista de nomes</h2>
            {content.instaMission.handles.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Nenhum nome ainda. Envie um print ou digite um @ acima.
              </p>
            ) : (
              <ul className="admin-insta-list">
                {content.instaMission.handles.map((handle) => (
                  <li key={handle} className="admin-insta-item">
                    <span className="admin-insta-handle">@{handle}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={instaBusy}
                      onClick={() => {
                        removeAdminInstaHandle(handle)
                        flash(`@${handle} removido`)
                      }}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      ) : null}

      {tab === 'videos' ? (
        <section className="stack admin-panel">
          <p className="muted" style={{ margin: 0 }}>
            Para cada exercício, cole um link (YouTube ou URL de vídeo) ou carregue um arquivo
            (mp4/webm). O app usa essa fonte no ícone de visão da aba Treino.
          </p>

          {filteredExercises.map((exercise) => {
            const current = getAdminVideo(exercise)
            const busy = busyExercise === exercise
            return (
              <article key={exercise} className="card stack-sm admin-video-card">
                <div className="row-between" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{exercise}</h2>
                    <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
                      {videoLabel(current, exercise)}
                      {current ? ' · personalizado' : ' · padrão do sistema'}
                    </p>
                  </div>
                  {current ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => resetVideo(exercise)}
                    >
                      Restaurar padrão
                    </button>
                  ) : null}
                </div>

                <div className="admin-video-actions">
                  <div className="field" style={{ flex: 1, minWidth: '16rem' }}>
                    <label htmlFor={`link-${exercise}`}>Link do vídeo</label>
                    <div className="admin-link-row">
                      <input
                        id={`link-${exercise}`}
                        value={linkDrafts[exercise] ?? ''}
                        placeholder="https://youtube.com/watch?v=… ou .mp4"
                        disabled={busy}
                        onChange={(e) =>
                          setLinkDrafts((d) => ({ ...d, [exercise]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy || !(linkDrafts[exercise] ?? '').trim()}
                        onClick={() => saveLink(exercise)}
                      >
                        Salvar link
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor={`file-${exercise}`}>Carregar arquivo</label>
                    <input
                      id={`file-${exercise}`}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        void saveUpload(exercise, file)
                        e.currentTarget.value = ''
                      }}
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
