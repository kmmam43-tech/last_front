import { useEffect, useMemo, useState } from 'react'
import { generateMaterial, listMaterials, updateMaterialStatus } from './api.js'

const supportOptions = ['짧은 문장', '핵심어 설명', '짧은 단락', '이미지와 대체 텍스트']
const kindLabels = {
  easy_sentences: '쉬운 문장',
  key_terms: '핵심어 설명',
  short_paragraphs: '짧은 단락',
  visual_worksheet: '이미지 학습지',
}
const reviewerLabels = {
  subject_content_reviewer: '교과 내용',
  accessibility_reviewer: '접근성',
  student_perspective_reviewer: '학생 관점',
}

const initialForm = {
  title: '',
  author: '교사',
  grade: '초등 4학년',
  language_level: '쉬운 한국어',
  supports: ['짧은 문장', '핵심어 설명'],
  original_text: '',
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [material, setMaterial] = useState(null)
  const [history, setHistory] = useState([])
  const [activeVariant, setActiveVariant] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    listMaterials().then(setHistory).catch(() => {})
  }, [])

  const selectedVariant = material?.variants?.[activeVariant]
  const progress = material ? 4 : busy ? 2 : 1
  const averageScore = useMemo(() => {
    if (!material?.reviews?.length) return 0
    return Math.round(material.reviews.reduce((sum, review) => sum + review.score, 0) / material.reviews.length)
  }, [material])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toggleSupport(option) {
    setForm((current) => ({
      ...current,
      supports: current.supports.includes(option)
        ? current.supports.filter((item) => item !== option)
        : [...current.supports, option],
    }))
  }

  async function handleGenerate(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('원문을 분석하고 세 관점에서 검토하고 있습니다.')
    try {
      const result = await generateMaterial(form)
      setMaterial(result)
      setActiveVariant(0)
      setHistory((current) => [result, ...current.filter((item) => item.id !== result.id)])
      setMessage(result.generation_mode === 'demo' ? '데모 생성이 완료되었습니다. OpenAI 키를 설정하면 실제 에이전트가 실행됩니다.' : '에이전트 생성과 검토가 완료되었습니다.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function decide(status) {
    if (!material) return
    setBusy(true)
    try {
      const updated = await updateMaterialStatus(material.id, status)
      setMaterial(updated)
      setHistory((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setMessage(status === 'approved' ? '승인되었습니다. 학생에게 제공할 수 있습니다.' : '반려되었습니다. 수정 후 다시 검토하세요.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="배움결 홈">
          <span className="brand-mark" aria-hidden="true">결</span>
          <span><strong>배움결</strong><small>수준별 학습자료 작업실</small></span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#compose">새 자료</a>
          <a href="#history">작업 기록</a>
        </nav>
      </header>

      <main id="top">
        <section className="intro">
          <div>
            <h1>원문의 뜻은 지키고,<br />배움의 길은 넓힙니다.</h1>
            <p>수업자료 하나를 학생의 학년과 언어 수준에 맞는 네 가지 자료로 바꾸고, 교과·접근성·학생 관점 검토까지 한 흐름에서 확인하세요.</p>
          </div>
          <ol className="process" aria-label="작업 단계">
            {['자료 입력', '핵심 분석', '수준별 생성', '교사 승인'].map((label, index) => (
              <li className={progress >= index + 1 ? 'active' : ''} key={label}>
                <span>{index + 1}</span>{label}
              </li>
            ))}
          </ol>
        </section>

        <section className="workspace" id="compose">
          <form className="composer" onSubmit={handleGenerate}>
            <div className="section-heading">
              <h2>수업자료 준비</h2>
              <p>학생을 진단명으로 판단하지 않고 필요한 지원 조건만 반영합니다.</p>
            </div>

            <label>자료 제목<input required name="title" value={form.title} onChange={updateField} placeholder="예: 물의 상태 변화" /></label>
            <div className="field-row">
              <label>학년<input required name="grade" value={form.grade} onChange={updateField} /></label>
              <label>언어 수준<input required name="language_level" value={form.language_level} onChange={updateField} /></label>
            </div>
            <label>교사 이름<input name="author" value={form.author} onChange={updateField} /></label>

            <fieldset>
              <legend>필요한 지원</legend>
              <div className="choice-grid">
                {supportOptions.map((option) => (
                  <label className="choice" key={option}>
                    <input type="checkbox" checked={form.supports.includes(option)} onChange={() => toggleSupport(option)} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              원본 내용
              <textarea required name="original_text" rows="12" value={form.original_text} onChange={updateField} placeholder="학습목표와 본문을 포함한 수업자료를 20자 이상 입력하세요." />
            </label>
            <button className="primary" disabled={busy || form.original_text.trim().length < 20}>
              {busy ? '자료를 만들고 있어요…' : '수준별 자료 만들기'}
            </button>
            {message && <p className="status-message" role="status">{message}</p>}
          </form>

          <section className="result-panel" aria-live="polite">
            {!material ? (
              <div className="empty-state">
                <div className="paper-stack" aria-hidden="true"><span /><span /><span /></div>
                <h2>생성 결과가 여기에 모입니다</h2>
                <p>원본과 네 가지 변환본, 세 검토자의 판단을 나란히 확인할 수 있습니다.</p>
              </div>
            ) : (
              <>
                <div className="result-head">
                  <div><p className="mode">{material.generation_mode === 'openai' ? 'OpenAI Agent 생성' : '로컬 데모 생성'}</p><h2>{material.title}</h2></div>
                  <span className={`status-pill ${material.status}`}>{material.status === 'approved' ? '승인됨' : material.status === 'rejected' ? '반려됨' : '검토 대기'}</span>
                </div>

                <div className="analysis-strip">
                  <div><span>학습목표</span><strong>{material.analysis.learning_objectives.length}</strong></div>
                  <div><span>핵심 개념</span><strong>{material.analysis.core_concepts.length}</strong></div>
                  <div><span>검토 평균</span><strong>{averageScore}</strong></div>
                </div>

                <div className="variant-tabs" role="tablist" aria-label="수준별 자료">
                  {material.variants.map((variant, index) => (
                    <button type="button" role="tab" aria-selected={activeVariant === index} onClick={() => setActiveVariant(index)} key={variant.kind}>{kindLabels[variant.kind]}</button>
                  ))}
                </div>

                <div className="comparison">
                  <article><h3>원본</h3><p>{material.original_text}</p></article>
                  <article className="generated">
                    <h3>{selectedVariant.title}</h3>
                    {selectedVariant.image_data_url && (
                      <figure className="worksheet-figure">
                        <img src={selectedVariant.image_data_url} alt={selectedVariant.alt_text || ''} />
                        {selectedVariant.alt_text && <figcaption>{selectedVariant.alt_text}</figcaption>}
                      </figure>
                    )}
                    <p>{selectedVariant.content}</p>
                    {selectedVariant.alt_text && !selectedVariant.image_data_url && <aside><strong>대체 텍스트</strong>{selectedVariant.alt_text}</aside>}
                  </article>
                </div>

                <div className="reviews">
                  <h3>세 관점 검토</h3>
                  {material.reviews.map((review) => (
                    <article key={review.reviewer}>
                      <div><strong>{reviewerLabels[review.reviewer]}</strong><span>{review.score}점</span></div>
                      <p>{review.summary}</p>
                    </article>
                  ))}
                </div>

                <div className="approval-bar">
                  <p>최종 제공 여부는 교사가 결정합니다.</p>
                  <div><button type="button" className="secondary" disabled={busy} onClick={() => decide('rejected')}>수정 필요</button><button type="button" className="primary compact" disabled={busy} onClick={() => decide('approved')}>승인하기</button></div>
                </div>
              </>
            )}
          </section>
        </section>

        <section className="history" id="history">
          <div className="section-heading"><h2>작업 기록</h2><p>작성 중인 자료와 승인된 자료를 한곳에서 확인합니다.</p></div>
          {history.length === 0 ? <p className="history-empty">아직 저장된 자료가 없습니다.</p> : (
            <div className="history-list">{history.map((item) => <button type="button" key={item.id} onClick={() => setMaterial(item)}><span>{item.title}<small>{item.grade} · 버전 {item.version}</small></span><strong>{item.status === 'approved' ? '승인' : item.status === 'rejected' ? '반려' : '검토 중'}</strong></button>)}</div>
          )}
        </section>
      </main>
      <footer>배움결은 교사의 판단을 대신하지 않습니다. 학생에게 제공하기 전 내용을 확인하세요.</footer>
    </div>
  )
}

export default App

