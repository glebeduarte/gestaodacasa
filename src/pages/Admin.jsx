import { useState } from 'react'
import { ArrowUp, ArrowDown, Pencil, Plus, LogOut, Check } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl } from '../util'
import { catStyle, CatTile, ICONES, CORES } from '../lib/categoryStyle'
import { FolhaPessoa, corAvatar } from './Pessoas'
import { FolhaObra } from './Obras'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'

const ABAS = [['categorias', 'Categorias'], ['fixos', 'Custos fixos'], ['pessoas', 'Pessoas'], ['obras', 'Obras']]
const ICON_LISTA = ['Zap', 'Droplet', 'Waves', 'Leaf', 'BrickWall', 'Sparkles', 'PawPrint', 'Wifi', 'Home', 'Wrench', 'ShieldCheck', 'Flame', 'Trash2', 'Car', 'Utensils', 'Tv', 'Bug', 'Hammer']

export default function Admin({ sessao }) {
  const [aba, setAba] = useState('categorias')
  const [editCat, setEditCat] = useState(null)
  const [novaPessoa, setNovaPessoa] = useState(false)
  const [editPessoa, setEditPessoa] = useState(null)
  const [novaObra, setNovaObra] = useState(false)
  const [editObra, setEditObra] = useState(null)
  const [fixoCat, setFixoCat] = useState(null)
  const toast = useToast()

  const { dados, recarregar } = useDados(async () => {
    const [categorias, pessoas, obras, fixos] = await Promise.all([
      supabase.from('categorias').select('*').order('ordem').then(r => r.data || []),
      q.pessoas(),
      q.obras(),
      supabase.from('custos_fixos').select('*, categorias(nome), pessoas(nome)').eq('ativo', true).then(r => r.data || []),
    ])
    return { categorias, pessoas, obras, fixos }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { categorias, pessoas, obras, fixos } = dados
  const ativas = categorias.filter(c => c.ativo)

  const mover = async (cat, dir) => {
    const idx = ativas.findIndex(c => c.id === cat.id)
    const alvo = ativas[idx + dir]; if (!alvo) return
    await supabase.from('categorias').update({ ordem: alvo.ordem }).eq('id', cat.id)
    await supabase.from('categorias').update({ ordem: cat.ordem }).eq('id', alvo.id)
    recarregar()
  }

  return (
    <>
      <header className="hdr"><div><p className="eyebrow">Configurações</p><h1>Ajustes</h1></div></header>
      <div className="hscroll">{ABAS.map(([v, t]) => <button key={v} className={`pick ${aba === v ? 'on' : ''}`} onClick={() => setAba(v)}>{t}</button>)}</div>

      {aba === 'categorias' && (
        <section className="px mt16">
          <div className="list">
            {ativas.map((c, i) => (
              <div key={c.id} className="row">
                <CatTile cat={c} size="md" />
                <div className="grow"><p className="t">{c.nome}</p></div>
                <button className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => mover(c, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp size={16} className="i" /></button>
                <button className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => mover(c, 1)} disabled={i === ativas.length - 1} aria-label="Descer"><ArrowDown size={16} className="i" /></button>
                <button className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => setEditCat(c)} aria-label="Editar"><Pencil size={16} className="i" /></button>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 10 }}>Use as setas para mudar a ordem em que aparecem no início.</p>
          <button className="btn soft block mt16" onClick={() => setEditCat({ nome: '', ordem: (categorias.at(-1)?.ordem || 0) + 1 })}><Plus size={18} className="i" />Nova categoria</button>
        </section>
      )}

      {aba === 'fixos' && (
        <section className="px mt16">
          {fixos.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum custo fixo. Abra uma categoria e toque em adicionar para criar contas recorrentes.</p></div>
            : <div className="list">{fixos.map(f => (
              <div key={f.id} className="row"><div className="grow"><p className="t">{f.pessoas?.nome ? `${f.pessoas.nome} · ` : ''}{f.descricao}</p><p className="s">{f.categorias?.nome}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''} · {f.recorrencia}</p></div>
                <b className="num">{brl(f.valor)}</b><button className="iconbtn" style={{ width: 34, height: 34, marginLeft: 8 }} onClick={async () => { if (confirm('Arquivar este custo fixo?')) { await supabase.from('custos_fixos').update({ ativo: false }).eq('id', f.id); recarregar() } }} aria-label="Arquivar">×</button></div>
            ))}</div>}
        </section>
      )}

      {aba === 'pessoas' && (
        <section className="px mt16">
          <div className="list">{pessoas.map(p => (
            <button key={p.id} className="row" onClick={() => setEditPessoa(p)}>
              <div className={`pill-av ${corAvatar(p)}`} style={{ width: 40, height: 40, fontSize: 14, borderRadius: 13 }}>{(p.nome || '?').slice(0, 2).toUpperCase()}</div>
              <div className="grow"><p className="t">{p.nome}</p><p className="s">{p.funcao} · {brl(p.valor_combinado)}</p></div><Pencil size={16} className="i chev" />
            </button>
          ))}</div>
          <button className="btn soft block mt16" onClick={() => setNovaPessoa(true)}><Plus size={18} className="i" />Nova pessoa</button>
        </section>
      )}

      {aba === 'obras' && (
        <section className="px mt16">
          <div className="list">{obras.map(o => (
            <button key={o.id} className="row" onClick={() => setEditObra(o)}>
              <CatTile cat={o.categorias} size="md" />
              <div className="grow"><p className="t">{o.nome}</p><p className="s">{o.status?.replace('_', ' ')}{o.orcamento_total ? ` · ${brl(o.orcamento_total)}` : ''}</p></div><Pencil size={16} className="i chev" />
            </button>
          ))}</div>
          <button className="btn soft block mt16" onClick={() => setNovaObra(true)}><Plus size={18} className="i" />Nova obra</button>
        </section>
      )}

      <section className="sec"><div className="sec-h"><h2>Quem usa</h2></div>
        <div className="px"><div className="list">
          <div className="row"><div className="avatar" style={{ width: 40, height: 40, boxShadow: 'none' }}>H</div><div className="grow"><p className="t">Hylana</p><p className="s">hylanaenf@gmail.com</p></div></div>
          <div className="row"><div className="avatar" style={{ width: 40, height: 40, boxShadow: 'none', background: 'linear-gradient(135deg,#7FA3C2,#44607C)' }}>G</div><div className="grow"><p className="t">Glebe</p><p className="s">glebejr@gmail.com</p></div></div>
        </div>
        <button className="btn ghost block mt12" style={{ color: 'var(--danger)' }} onClick={() => supabase.auth.signOut()}><LogOut size={18} className="i" />Sair</button></div>
      </section>
      <div style={{ height: 12 }} />

      {editCat && <EditorCategoria cat={editCat} onFechar={() => setEditCat(null)} onSalvo={() => { recarregar(); toast('Categoria salva') }} />}
      {novaPessoa && <FolhaPessoa cats={categorias} onFechar={() => setNovaPessoa(false)} onSalvo={recarregar} />}
      {editPessoa && <FolhaPessoa inicial={editPessoa} cats={categorias} onFechar={() => setEditPessoa(null)} onSalvo={recarregar} />}
      {novaObra && <FolhaObra cats={categorias} pessoas={pessoas} onFechar={() => setNovaObra(false)} onSalvo={recarregar} />}
      {editObra && <FolhaObra inicial={editObra} cats={categorias} pessoas={pessoas} onFechar={() => setEditObra(null)} onSalvo={recarregar} />}
    </>
  )
}

function EditorCategoria({ cat, onFechar, onSalvo }) {
  const atual = catStyle(cat)
  const [nome, setNome] = useState(cat.nome || '')
  const [icone, setIcone] = useState(cat.icone || atual.iconName || 'Tag')
  const [cor, setCor] = useState(cat.cor || atual.cls || 'c-neutral')
  const salvar = async () => {
    if (!nome) return
    const payload = { nome, icone, cor }
    if (cat.id) await supabase.from('categorias').update(payload).eq('id', cat.id)
    else await supabase.from('categorias').insert({ ...payload, ordem: cat.ordem, ativo: true })
    onSalvo(); onFechar()
  }
  const arquivar = async () => { if (!cat.id || !confirm('Arquivar esta categoria?')) return; await supabase.from('categorias').update({ ativo: false }).eq('id', cat.id); onSalvo(); onFechar() }
  return (
    <Sheet titulo={cat.id ? 'Editar categoria' : 'Nova categoria'} onFechar={onFechar}>
      <div className="stack-y">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><CatTile cat={{ nome, icone, cor }} size="lg" /><input className="input" value={nome} onChange={e => setNome(e.target.value)} style={{ flex: 1 }} placeholder="Nome da categoria" /></div>
        <div><p className="step" style={{ margin: '6px 0 8px' }}>Ícone</p><div className="iconpick">{ICON_LISTA.map(n => { const Ico = ICONES[n]; return <button key={n} type="button" className={icone === n ? 'on' : ''} onClick={() => setIcone(n)}><Ico size={20} className="i" /></button> })}</div></div>
        <div><p className="step" style={{ margin: '6px 0 8px' }}>Cor</p><div className="colorpick">{CORES.slice(0, 8).map(cls => { const st = catStyle({ cor: cls }); return <button key={cls} type="button" className={cor === cls ? 'on' : ''} onClick={() => setCor(cls)}><span className={cls} style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--c)' }} /></button> })}</div></div>
        <div className="btnrow">{cat.id && <button className="btn" onClick={arquivar}>Arquivar</button>}<button className="btn primary" onClick={salvar}>Salvar</button></div>
      </div>
    </Sheet>
  )
}
