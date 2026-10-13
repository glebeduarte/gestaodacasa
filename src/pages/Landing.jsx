import { Receipt, Camera, Upload, Hammer, Users, Wrench, Package, Home, Building2, Building, Tractor, Waves, ShieldCheck, Smartphone, UserPlus, Check, ChevronDown, ArrowRight, Leaf, PawPrint, FileBarChart } from 'lucide-react'
import { useState } from 'react'
import { arte } from '../lib/sectionArt'
import { SECOES, degrade } from '../lib/sectionThemes'

// Página pública de apresentação, para quem ainda não tem conta
export default function Landing({ onEntrar }) {
  const [aberta, setAberta] = useState(null)
  const g = SECOES.inicio.g
  const criar = () => onEntrar('criar')
  const entrar = () => onEntrar('entrar')

  return (
    <div className="lp">
      <header className="lp-top">
        <b className="lp-logo">Gestão Doméstica</b>
        <button className="lp-link" onClick={entrar}>Entrar</button>
      </header>

      <section className="lp-hero" style={{ background: g[0] }}>
        <div className="s-img" style={{ backgroundImage: `url("${arte('inicio', g)}")` }} />
        <div className="lp-hero-grad" style={{ background: `linear-gradient(100deg, ${g[0]} 0%, ${g[0]}f0 40%, ${g[1]}66 80%, ${g[1]}22 100%)` }} />
        <div className="lp-hero-body">
          <p className="lp-eyebrow">Para quem cuida de uma casa de verdade</p>
          <h1>A casa inteira organizada num lugar só</h1>
          <p className="lp-sub">Contas com vencimento, pagamentos de quem trabalha na casa, obras com orçamento e prazo, manutenções e estoque. Tudo no celular, com lançamento em dois toques.</p>
          <div className="lp-ctas">
            <button className="lp-btn" onClick={criar}>Criar minha conta<ArrowRight size={18} /></button>
            <button className="lp-btn ghost" onClick={entrar}>Já tenho conta</button>
          </div>
        </div>
      </section>

      <section className="lp-sec">
        <h2>Onde a casa costuma sair do controle</h2>
        <div className="lp-dores">
          {[
            ['Conta que vence e ninguém viu', 'A fatura chega, fica no e-mail ou na gaveta, e só aparece quando vem a multa.'],
            ['Obra combinada de boca', 'Começa sem orçamento escrito, sem prazo, e ninguém sabe ao certo quanto já foi pago.'],
            ['Adiantamento anotado no papel', 'A diarista pediu um vale no dia 5, outro no dia 12. No fim do mês, a conta não fecha.'],
            ['Manutenção lembrada tarde', 'Caixa d\'água, dedetização, bomba da piscina. Só se pensa nelas quando quebram.'],
          ].map(([t, s]) => <div key={t} className="lp-dor"><b>{t}</b><p>{s}</p></div>)}
        </div>
      </section>

      <section className="lp-sec">
        <h2>Como funciona</h2>
        <div className="lp-passos">
          {[
            [Home, 'Crie a sua casa', 'Escolha o tipo: casa, condomínio, apartamento, sítio ou casa de praia. O app já sugere as categorias e os cuidados certos para ela.'],
            [Check, 'Ligue o que você usa', 'Pessoas, obras, piscina, jardim, pets, veículos. Cada parte vira um módulo. Liga e desliga quando quiser.'],
            [Smartphone, 'Lance em dois toques', 'Toque no +, escolha o que foi e digite o valor. Ou tire uma foto da conta e deixe o app ler para você.'],
          ].map(([I, t, s], i) => <div key={t} className="lp-passo"><span className="lp-num">{i + 1}</span><I size={22} /><b>{t}</b><p>{s}</p></div>)}
        </div>
      </section>

      <section className="lp-sec">
        <h2>O que vem dentro</h2>
        <div className="lp-feats">
          {[
            ['contas', Receipt, 'Contas com vencimento', 'A vencer, pagas e atrasadas, com aviso no início. Um toque marca como paga.'],
            ['contas', Camera, 'Leitura de contas por foto', 'Fotografe a conta de luz ou envie o PDF. Valor, vencimento, consumo e categoria são preenchidos sozinhos.'],
            ['categorias', Upload, 'Importação de extrato', 'Envie o extrato do banco ou a fatura do cartão. Você aprova cada lançamento antes de entrar.'],
            ['obras', Hammer, 'Obras sob controle', 'Checklist do que foi combinado, orçamentos, quanto falta pagar e relatório completo em PDF.'],
            ['pessoas', Users, 'Pessoas e adiantamentos', 'Cada vale fica registrado e é descontado sozinho no próximo pagamento.'],
            ['manutencoes', Wrench, 'Manutenções no prazo', 'Agenda de cuidados que se repetem, com aviso quando atrasam.'],
            ['estoque', Package, 'Estoque da casa', 'Cloro, ração, produtos de limpeza. Avisa quando está acabando e monta a lista de compras.'],
            ['documentos', FileBarChart, 'Relatórios', 'Fechamento do mês e relatório de cada obra, prontos para imprimir ou mandar no WhatsApp.'],
          ].map(([k, I, t, s]) => (
            <div key={t} className="lp-feat"><span className="lp-ic" style={{ background: degrade(SECOES[k].g) }}><I size={20} /></span><div><b>{t}</b><p>{s}</p></div></div>
          ))}
        </div>
      </section>

      <section className="lp-sec">
        <h2>Feito para o seu tipo de casa</h2>
        <div className="lp-tipos">
          {[[Home, 'Casa', 'piscina'], [Building2, 'Condomínio', 'categorias'], [Building, 'Apartamento', 'contas'], [Tractor, 'Granja ou sítio', 'jardim'], [Waves, 'Casa de praia', 'piscina'], [PawPrint, 'Com pets', 'pets'], [Leaf, 'Com jardim', 'jardim']].map(([I, t, k]) => (
            <span key={t} className="lp-tipo" style={{ background: degrade(SECOES[k].g) }}><I size={16} />{t}</span>
          ))}
        </div>
        <p className="lp-nota">Tem mais de uma casa? Cada uma fica separada, com suas próprias contas, cores e pessoas.</p>
      </section>

      <section className="lp-sec">
        <h2>Para a família toda</h2>
        <div className="lp-dores">
          <div className="lp-dor"><UserPlus size={20} /><b>Convide quem divide a casa</b><p>Cada pessoa entra com o próprio e-mail. Você escolhe quem edita e quem só acompanha.</p></div>
          <div className="lp-dor"><ShieldCheck size={20} /><b>Os dados são da casa</b><p>Só os membros convidados veem as informações. Nada fica aberto para outras contas.</p></div>
        </div>
      </section>

      <section className="lp-sec">
        <h2>Perguntas frequentes</h2>
        <div className="lp-faq">
          {[
            ['Funciona no celular?', 'Sim. Foi desenhado primeiro para o celular e também funciona no computador, direto no navegador.'],
            ['Preciso instalar alguma coisa?', 'Não. Basta criar a conta e abrir pelo navegador. No celular, dá para adicionar à tela inicial.'],
            ['Quem consegue ver os meus dados?', 'Só as pessoas que você convidar para a casa. Cada convidado pode editar ou apenas consultar.'],
            ['Posso usar para mais de uma casa?', 'Pode. Você cria quantas casas quiser e troca entre elas com um toque.'],
            ['Como começo?', 'Crie a conta, confirme o e-mail e siga o assistente de três passos para montar a primeira casa.'],
          ].map(([q, a], i) => (
            <div key={q} className={`lp-q ${aberta === i ? 'on' : ''}`}>
              <button onClick={() => setAberta(aberta === i ? null : i)}>{q}<ChevronDown size={18} /></button>
              {aberta === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final" style={{ background: degrade(g) }}>
        <h2>Comece pela sua casa hoje</h2>
        <p>Leva poucos minutos para montar. O resto você lança no dia a dia.</p>
        <button className="lp-btn" onClick={criar}>Criar minha conta<ArrowRight size={18} /></button>
        <button className="lp-link claro" onClick={entrar}>Já tenho conta, quero entrar</button>
      </section>

      <footer className="lp-rodape">Gestão Doméstica</footer>
    </div>
  )
}
