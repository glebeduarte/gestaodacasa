import { useState } from 'react'
import { Receipt, Camera, Hammer, Users, Wrench, Package, Home, Building2, Building, Tractor, Waves, Check, ChevronDown, ArrowRight, Leaf, PawPrint, FileBarChart, Plus, Bell, LayoutGrid, Zap, Droplet, Wifi, Sparkles, ShieldCheck, Upload, CalendarClock } from 'lucide-react'
import { SECOES, degrade } from '../lib/sectionThemes'
import './landing.css'

const G = (k) => degrade(SECOES[k].g)

// ---------- Peças de mockup ----------
function Phone({ children, className = '' }) {
  return <div className={`mk-phone ${className}`}><div className="mk-notch" /><div className="mk-screen">{children}</div></div>
}
function Barra({ t }) { return <div className="mk-status"><span>9:41</span><span className="mk-dots">●●●</span></div> }
function Hero({ k, titulo, sub, valor }) {
  const I = SECOES[k].Icon
  return <div className="mk-hero" style={{ background: G(k) }}><I size={16} /><b>{titulo}</b>{sub && <small>{sub}</small>}{valor && <strong>{valor}</strong>}</div>
}
function Linha({ k, t, s, v, tag, tom }) {
  const I = SECOES[k].Icon
  return <div className="mk-row"><span className="mk-ic" style={{ background: G(k) }}><I size={13} /></span><div><b>{t}</b><small>{s}</small></div><div className="mk-r"><b>{v}</b>{tag && <em className={tom}>{tag}</em>}</div></div>
}
function NavInf() {
  return <div className="mk-nav"><Home size={14} /><Receipt size={14} /><span className="mk-mid"><Plus size={14} /></span><LayoutGrid size={14} /><Users size={14} /></div>
}

function TelaInicio() {
  return (<>
    <Barra />
    <div className="mk-pad"><small className="mk-muted">Terça, 13 de outubro</small><h4>Bom dia, Hylana</h4></div>
    <div className="mk-hero big" style={{ background: G('inicio') }}><small>Gasto em outubro</small><strong>R$ 8.426,90</strong><div className="mk-bar"><i style={{ width: '64%' }} /></div><small>64% do previsto</small></div>
    <div className="mk-alert"><Bell size={12} /><span><b>2 contas</b> vencem esta semana</span></div>
    <div className="mk-grid">
      {['contas', 'pessoas', 'obras', 'piscina'].map(k => { const I = SECOES[k].Icon; return <div key={k} className="mk-tile" style={{ background: G(k) }}><I size={14} /><b>{SECOES[k].nome}</b></div> })}
    </div>
    <NavInf />
  </>)
}
function TelaContas() {
  return (<>
    <Barra />
    <Hero k="contas" titulo="Contas da casa" sub="Outubro" valor="R$ 1.284,62" />
    <div className="mk-seg"><span className="on">Em aberto · 3</span><span>Histórico</span></div>
    <div className="mk-list">
      <Linha k="energia" t="Cosern" s="Vence 15/10" v="R$ 287,40" tag="A vencer" tom="warn" />
      <Linha k="agua" t="Caern" s="Vence 18/10" v="R$ 142,10" tag="A vencer" tom="warn" />
      <Linha k="internet" t="Internet fibra" s="Venceu 10/10" v="R$ 119,90" tag="Atrasada" tom="bad" />
      <Linha k="saude" t="Plano de saúde" s="Paga 05/10" v="R$ 735,22" tag="Paga" tom="ok" />
    </div>
    <NavInf />
  </>)
}
function TelaPessoa() {
  return (<>
    <Barra />
    <Hero k="pessoas" titulo="Bel" sub="Diarista · semanal" valor="R$ 1.120,00" />
    <div className="mk-card">
      <div className="mk-kv"><span>Pagamento de outubro</span><b>R$ 1.120,00</b></div>
      <div className="mk-kv neg"><span>Vale 05/10</span><b>− R$ 100,00</b></div>
      <div className="mk-kv neg"><span>Vale 12/10</span><b>− R$ 150,00</b></div>
      <div className="mk-kv tot"><span>A pagar</span><b>R$ 870,00</b></div>
    </div>
    <div className="mk-btn" style={{ background: G('pessoas') }}>Registrar pagamento</div>
    <div className="mk-list"><Linha k="diaristas" t="Setembro" s="Pago 30/09" v="R$ 1.120,00" tag="Pago" tom="ok" /></div>
    <NavInf />
  </>)
}
function TelaAreas() {
  const ks = ['contas', 'categorias', 'pessoas', 'obras', 'manutencoes', 'estoque', 'piscina', 'jardim', 'pets', 'documentos']
  return (<>
    <Barra />
    <Hero k="categorias" titulo="Áreas da casa" sub="Casa da praia" />
    <div className="mk-grid two">
      {ks.map(k => { const I = SECOES[k].Icon; return <div key={k} className="mk-tile" style={{ background: G(k) }}><span className="mk-plus">+</span><I size={14} /><b>{SECOES[k].nome}</b></div> })}
    </div>
  </>)
}

function Browser({ children }) {
  return <div className="mk-browser"><div className="mk-bbar"><i /><i /><i /><span>gestao.domestica/obras/reforma-varanda</span></div>{children}</div>
}
function TelaObra() {
  return (
    <div className="mk-obra">
      <div className="mk-hero wide" style={{ background: G('obras') }}><Hammer size={18} /><div><b>Reforma da varanda</b><small>Em andamento · início 02/09 · previsão 30/10</small></div><strong>R$ 18.400,00</strong></div>
      <div className="mk-obra-g">
        <div className="mk-card">
          <h5>Financeiro</h5>
          <div className="mk-kv"><span>Orçamento</span><b>R$ 18.400,00</b></div>
          <div className="mk-kv"><span>Pago</span><b>R$ 11.950,00</b></div>
          <div className="mk-bar dark"><i style={{ width: '65%', background: G('obras') }} /></div>
          <div className="mk-kv tot"><span>Falta pagar</span><b>R$ 6.450,00</b></div>
        </div>
        <div className="mk-card">
          <h5>Combinado com o pedreiro</h5>
          {[['Demolição do piso antigo', 1], ['Contrapiso e impermeabilização', 1], ['Porcelanato 90x90', 1], ['Rodapé e rejunte', 0], ['Limpeza final', 0]].map(([t, ok]) => (
            <div key={t} className={`mk-chk ${ok ? 'ok' : ''}`}><span>{ok ? <Check size={10} /> : null}</span>{t}</div>
          ))}
        </div>
        <div className="mk-card span">
          <h5>Pagamentos</h5>
          <div className="mk-tab"><span>02/09</span><span>Sinal · Pix</span><b>R$ 5.000,00</b></div>
          <div className="mk-tab"><span>20/09</span><span>Material · cartão</span><b>R$ 4.450,00</b></div>
          <div className="mk-tab"><span>05/10</span><span>2ª parcela · Pix</span><b>R$ 2.500,00</b></div>
        </div>
      </div>
    </div>
  )
}

// ---------- Página ----------
export default function Landing({ onEntrar }) {
  const [aberta, setAberta] = useState(0)
  const criar = () => onEntrar('criar')
  const entrar = () => onEntrar('entrar')
  const ir = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="lp2">
      <header className="l-nav">
        <div className="l-wrap l-nav-in">
          <b className="l-logo"><span style={{ background: G('inicio') }}><Home size={15} /></span>Gestão Doméstica</b>
          <nav><button onClick={() => ir('recursos')}>Recursos</button><button onClick={() => ir('como')}>Como funciona</button><button onClick={() => ir('faq')}>Dúvidas</button></nav>
          <div className="l-nav-ctas"><button className="l-link" onClick={entrar}>Entrar</button><button className="l-btn sm" onClick={criar}>Criar conta</button></div>
        </div>
      </header>

      <section className="l-hero">
        <div className="l-wrap l-hero-in">
          <div className="l-hero-txt">
            <span className="l-pill"><Sparkles size={13} />Contas lidas por foto com IA</span>
            <h1>A casa inteira organizada num lugar só</h1>
            <p>Contas com vencimento, pagamento de quem trabalha na casa, obras, manutenções e estoque. No celular, com lançamento em dois toques.</p>
            <div className="l-ctas"><button className="l-btn" onClick={criar}>Criar minha conta<ArrowRight size={17} /></button><button className="l-btn ghost" onClick={() => ir('recursos')}>Ver como é por dentro</button></div>
            <ul className="l-checks"><li><Check size={14} />Funciona no navegador</li><li><Check size={14} />Várias casas na mesma conta</li><li><Check size={14} />Família com acesso controlado</li></ul>
          </div>
          <div className="l-hero-vis">
            <Phone className="back"><TelaContas /></Phone>
            <Phone className="front"><TelaInicio /></Phone>
            <div className="l-float f1"><span style={{ background: G('energia') }}><Camera size={14} /></span><div><b>Conta da Cosern lida</b><small>R$ 287,40 · vence 15/10</small></div></div>
            <div className="l-float f2"><span style={{ background: G('pessoas') }}><Check size={14} /></span><div><b>Vale descontado</b><small>Bel · − R$ 250,00</small></div></div>
          </div>
        </div>
      </section>

      <section className="l-strip">
        <div className="l-wrap l-strip-in">
          {[['contas', 'Contas'], ['pessoas', 'Pessoas'], ['obras', 'Obras'], ['manutencoes', 'Manutenções'], ['estoque', 'Estoque'], ['piscina', 'Piscina'], ['jardim', 'Jardim'], ['pets', 'Pets']].map(([k, t]) => { const I = SECOES[k].Icon; return <span key={k}><i style={{ background: G(k) }}><I size={13} /></i>{t}</span> })}
        </div>
      </section>

      <div id="recursos" />
      <section className="l-feat">
        <div className="l-wrap l-feat-in">
          <div className="l-feat-txt">
            <span className="l-kicker" style={{ color: SECOES.contas.g[0] }}>Contas</span>
            <h2>Nenhuma conta vence sem ninguém ver</h2>
            <p>Fotografe a conta de luz ou envie o PDF. O app lê valor, vencimento, consumo e fornecedor e deixa tudo pronto para você conferir.</p>
            <ul className="l-list">
              <li><Camera size={16} />Leitura por foto ou PDF</li>
              <li><Bell size={16} />Atrasadas e a vencer em destaque na tela inicial</li>
              <li><Upload size={16} />Importação do extrato do banco e da fatura do cartão, com aprovação item a item</li>
            </ul>
          </div>
          <div className="l-feat-vis"><Phone><TelaContas /></Phone>
            <div className="l-float f3 l-scan"><div className="l-scan-doc"><i /><i /><i /><i /></div><div><small>Lendo a conta…</small><b>Valor R$ 287,40</b><b>Vencimento 15/10</b><b>Consumo 312 kWh</b></div></div>
          </div>
        </div>
      </section>

      <section className="l-feat alt">
        <div className="l-wrap l-feat-in rev">
          <div className="l-feat-txt">
            <span className="l-kicker" style={{ color: SECOES.obras.g[0] }}>Obras</span>
            <h2>Obra com orçamento, combinado e prazo por escrito</h2>
            <p>Registre o que foi acertado com o prestador, cada pagamento feito e quanto ainda falta. No fim, gere o relatório completo para imprimir ou mandar no WhatsApp.</p>
            <ul className="l-list">
              <li><Check size={16} />Checklist do que foi combinado</li>
              <li><Receipt size={16} />Orçamento, pago e falta pagar sempre à vista</li>
              <li><FileBarChart size={16} />Relatório por obra em PDF</li>
            </ul>
          </div>
          <div className="l-feat-vis wide"><Browser><TelaObra /></Browser></div>
        </div>
      </section>

      <section className="l-feat">
        <div className="l-wrap l-feat-in">
          <div className="l-feat-txt">
            <span className="l-kicker" style={{ color: SECOES.pessoas.g[0] }}>Pessoas</span>
            <h2>Vales e pagamentos que fecham no fim do mês</h2>
            <p>Diarista, jardineiro, piscineiro. Cada adiantamento fica registrado e é descontado sozinho no próximo pagamento. O que sobrar passa para o mês seguinte.</p>
            <ul className="l-list">
              <li><Users size={16} />Histórico de pagamentos por pessoa</li>
              <li><Receipt size={16} />Itens do pagamento detalhados</li>
              <li><CalendarClock size={16} />Recorrência semanal, quinzenal ou mensal</li>
            </ul>
          </div>
          <div className="l-feat-vis"><Phone><TelaPessoa /></Phone></div>
        </div>
      </section>

      <section className="l-feat alt">
        <div className="l-wrap l-feat-in rev">
          <div className="l-feat-txt">
            <span className="l-kicker" style={{ color: SECOES.categorias.g[0] }}>Áreas da casa</span>
            <h2>Cada casa mostra só o que ela tem</h2>
            <p>Casa com piscina, apartamento, sítio ou casa de praia. Ao criar a casa, o app sugere as áreas e categorias certas. Você liga e desliga módulos quando quiser.</p>
            <div className="l-tipos">
              {[[Home, 'Casa'], [Building2, 'Condomínio'], [Building, 'Apartamento'], [Tractor, 'Sítio ou granja'], [Waves, 'Casa de praia'], [PawPrint, 'Com pets'], [Leaf, 'Com jardim']].map(([I, t]) => <span key={t}><I size={14} />{t}</span>)}
            </div>
          </div>
          <div className="l-feat-vis"><Phone><TelaAreas /></Phone></div>
        </div>
      </section>

      <section className="l-mais">
        <div className="l-wrap">
          <h2 className="l-h2c">E o que mais costuma ficar esquecido</h2>
          <div className="l-mais-g">
            <div className="l-mini">
              <div className="l-mini-ui"><Linha k="piscina" t="Troca da areia do filtro" s="A cada 12 meses" v="Atrasada" /><Linha k="estrutura" t="Limpeza da caixa d'água" s="Próxima 02/11" v="Em dia" /></div>
              <b><Wrench size={15} />Manutenções</b><p>Cuidados que se repetem, com aviso quando passam do prazo.</p>
            </div>
            <div className="l-mini">
              <div className="l-mini-ui">
                {[['Cloro granulado', 2, 5], ['Ração', 1, 3], ['Detergente', 8, 4]].map(([t, q, m]) => <div key={t} className="mk-stock"><span>{t}</span><div className="mk-bar dark"><i style={{ width: `${Math.min(100, q / m * 60)}%`, background: q <= m ? '#d9534f' : G('estoque') }} /></div><em className={q <= m ? 'bad' : 'ok'}>{q <= m ? 'Acabando' : 'Ok'}</em></div>)}
              </div>
              <b><Package size={15} />Estoque</b><p>Produtos da casa com mínimo definido e lista de compras pronta.</p>
            </div>
            <div className="l-mini">
              <div className="l-mini-ui">
                <div className="mk-bars">{[52, 70, 45, 88, 64, 76].map((h, i) => <i key={i} style={{ height: `${h}%`, background: G('inicio') }} />)}</div>
                <div className="mk-kv"><span>Fechamento de setembro</span><b>R$ 9.120,40</b></div>
              </div>
              <b><FileBarChart size={15} />Relatórios</b><p>Fechamento do mês por categoria e relatório de cada obra.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="l-fam" id="como">
        <div className="l-wrap l-fam-in">
          <div>
            <h2>Comece em três passos</h2>
            <ol className="l-steps">
              <li><span>1</span><div><b>Crie a conta</b><p>Com seu e-mail. Leva menos de um minuto.</p></div></li>
              <li><span>2</span><div><b>Monte a casa</b><p>Escolha o tipo e os módulos. Categorias e cuidados já vêm sugeridos.</p></div></li>
              <li><span>3</span><div><b>Convide quem divide a casa</b><p>Cada pessoa entra com o próprio e-mail, como editora ou só leitura.</p></div></li>
            </ol>
          </div>
          <div className="l-members">
            <div className="l-members-h"><ShieldCheck size={16} /><b>Membros da casa</b></div>
            {[['GD', 'Glebe', 'Dono', 'inicio'], ['HY', 'Hylana', 'Editora', 'pessoas'], ['CO', 'Contador', 'Leitura', 'documentos']].map(([a, n, p, k]) => (
              <div key={n} className="l-mem"><span style={{ background: G(k) }}>{a}</span><b>{n}</b><em>{p}</em></div>
            ))}
            <div className="l-mem add"><span><Plus size={14} /></span><b>Convidar por e-mail</b></div>
            <p>Os dados ficam visíveis apenas para os membros convidados de cada casa.</p>
          </div>
        </div>
      </section>

      <section className="l-faq" id="faq">
        <div className="l-wrap l-faq-in">
          <div><h2>Dúvidas comuns</h2><p className="l-muted">Não achou o que procurava? Crie a conta e explore por dentro.</p></div>
          <div>
            {[
              ['Funciona no celular?', 'Sim. Foi desenhado primeiro para o celular e também funciona no computador, direto no navegador. No celular, dá para adicionar à tela inicial como um app.'],
              ['Preciso instalar alguma coisa?', 'Não. Basta criar a conta e abrir pelo navegador.'],
              ['Quem consegue ver os meus dados?', 'Só as pessoas que você convidar para a casa. Cada convidado pode editar ou apenas consultar.'],
              ['Posso usar para mais de uma casa?', 'Pode. Cada casa tem suas próprias contas, pessoas, cores e membros, e você troca entre elas com um toque.'],
              ['Como a leitura de contas funciona?', 'Você envia a foto ou o PDF, a IA preenche os campos e você confere antes de salvar. Nada entra sem a sua aprovação.'],
            ].map(([q, a], i) => (
              <div key={q} className={`l-q ${aberta === i ? 'on' : ''}`}>
                <button onClick={() => setAberta(aberta === i ? null : i)}>{q}<ChevronDown size={18} /></button>
                {aberta === i && <p>{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="l-final">
        <div className="l-wrap l-final-in">
          <div>
            <h2>Monte a sua casa hoje</h2>
            <p>Poucos minutos para configurar. O resto você lança no dia a dia.</p>
            <div className="l-ctas"><button className="l-btn light" onClick={criar}>Criar minha conta<ArrowRight size={17} /></button><button className="l-btn ghost" onClick={entrar}>Já tenho conta</button></div>
          </div>
          <div className="l-final-vis"><Phone><TelaAreas /></Phone></div>
        </div>
      </section>

      <footer className="l-foot"><div className="l-wrap"><b className="l-logo"><span style={{ background: G('inicio') }}><Home size={13} /></span>Gestão Doméstica</b><small>Organização financeira e operacional da casa.</small></div></footer>
    </div>
  )
}
