// Exemplo anim3d-rede-logica · Descoberta de rede em ondas e queda de equipamento, sobre a topologia LÓGICA derivada dos cabos do rack.
// SVG (diagrama 2D de ~23 nós): foco e teclado por dispositivo, texto selecionável. O motor decide tudo; a tela só revela e pinta.
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useMovimentoReduzido, useTokens } from '@anim3d/kit';
import { tracar } from '../../anim3d-topologia/exemplo/topologiaSim';
import { impactoDeFalha, ordemDeDescoberta } from '../motor/redeLogica';
import { SALAS } from '../../anim3d-infra-fisica/exemplo/empresaDados';
import { ANCORA, comDesligado, layout, redeDaEmpresa, SEMENTE } from './redeExemplo';
import './descobertaRede.css';

const L = 760;
const A = 420;
const MS_POR_ONDA = 700;
const DESLIGAVEIS = ['core', 'acc1', 'acc2', 'fw', 'rt', 'arq'];

// Cores por tokens (--dr-*); os valores padrão ficam nesta linha PADRAO com estética corporativa NOC.
const MAPA = { fundo: '--dr-fundo', cabo: '--dr-cabo', descoberto: '--dr-descoberto', novo: '--dr-novo', apagado: '--dr-apagado', erro: '--dr-erro', texto: '--dr-texto', selecao: '--dr-selecao' } as const;
const PADRAO: Record<keyof typeof MAPA, string> = { fundo: '#08111e', cabo: '#1e3a5f', descoberto: '#06b6d4', novo: '#f59e0b', apagado: '#334155', erro: '#ef4444', texto: '#cdeffb', selecao: '#ffffff' };
const COR_TIPO: Record<string, string> = { roteador: 'rede', firewall: 'rede', switch: 'rede', servidor: 'servidor', pc: 'estacao' };
const FORMA = (tipo: string, id: string) => (id.startsWith('ap-') ? 'ap' : COR_TIPO[tipo] ?? 'estacao');

export function DescobertaRede() {
  const cor = useTokens(MAPA, PADRAO);
  const reduzido = useMovimentoReduzido();
  const { topo, salaDe } = useMemo(() => redeDaEmpresa(), []);
  const [falho, setFalho] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string>('pc-2-1');
  const [onda, setOnda] = useState(0); // maior onda já revelada
  const [rodando, setRodando] = useState(false);
  const [ciclo, setCiclo] = useState(0); // muda a cada "Descobrir" para reiniciar

  const t = useMemo(() => comDesligado(topo, falho), [topo, falho]);
  const pos = useMemo(() => layout(topo, L, A), [topo]);
  const ordem = useMemo(() => ordemDeDescoberta(t, SEMENTE), [t]);
  const ondaMax = useMemo(() => ordem.reduce((m, o) => Math.max(m, o.onda), 0), [ordem]);
  const impacto = useMemo(() => (falho ? impactoDeFalha(topo, falho, ANCORA, salaDe) : null), [falho, topo, salaDe]);
  const nome = (id: string) => topo.disps.find((d) => d.id === id)?.nome ?? id;

  // reinicia a descoberta quando a rede muda ou o usuário pede
  useEffect(() => {
    if (reduzido) { setOnda(ondaMax); setRodando(false); return; }
    setOnda(0);
    setRodando(true);
  }, [t, ciclo, reduzido, ondaMax]);

  useEffect(() => {
    if (!rodando) return;
    if (onda >= ondaMax) { setRodando(false); return; }
    const id = window.setTimeout(() => setOnda((o) => o + 1), MS_POR_ONDA);
    return () => window.clearTimeout(id);
  }, [rodando, onda, ondaMax]);

  const descoberto = useMemo(() => new Map(ordem.filter((o) => o.onda <= onda).map((o) => [o.id, o])), [ordem, onda]);
  const via = useMemo(() => new Set([...descoberto.values()].map((o) => o.via).filter((v): v is string => !!v)), [descoberto]);
  const naoVistos = topo.disps.filter((d) => !ordem.some((o) => o.id === d.id) && d.id !== falho);

  const resultado = useMemo(() => (selecionado && selecionado !== ANCORA ? tracar(t, selecionado, ANCORA, 'icmp') : null), [t, selecionado]);

  const teclar = useCallback((e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelecionado(id); }
  }, []);

  return (
    <div className="dr-raiz">
      <div className="dr-corpo">
        <div className="dr-palco">
          <div className="dr-barra">
            <button onClick={() => setCiclo((c) => c + 1)}>▶ Descobrir a partir do {nome(SEMENTE)}</button>
            <span className="dr-estado" role="status">
              {rodando ? `onda ${onda} de ${ondaMax}…` : `${descoberto.size} de ${topo.disps.length} equipamentos descobertos`}
            </span>
          </div>
          <svg className="dr-svg" viewBox={`0 0 ${L} ${A}`} role="group" aria-label="Topologia lógica da empresa, derivada dos cabos físicos">
            {topo.enlaces.map((e) => {
              const a = pos[e.a];
              const b = pos[e.b];
              const caido = e.a === falho || e.b === falho;
              const achou = via.has(e.id);
              return a && b ? <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`dr-cabo ${achou ? 'achou' : ''} ${caido ? 'caido' : ''}`} stroke={caido ? cor.erro : achou ? cor.descoberto : cor.cabo} /> : null;
            })}
            {topo.disps.map((d) => {
              const p = pos[d.id];
              const d0 = descoberto.get(d.id);
              const novo = !!d0 && d0.onda === onda && rodando;
              const off = d.id === falho;
              const forma = FORMA(d.tipo, d.id);
              const preench = off ? cor.erro : d0 ? (novo ? cor.novo : cor.descoberto) : cor.apagado;
              return (
                <g key={d.id} className={`dr-no ${forma} ${selecionado === d.id ? 'sel' : ''}`} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`${d.nome}${d.ip ? `, ${d.ip}` : ''}${off ? ', desligado' : d0 ? ', descoberto' : ', não descoberto'}`} onClick={() => setSelecionado(d.id)} onKeyDown={(e) => teclar(e, d.id)}>
                  {forma === 'ap' ? <circle r="8" fill={preench} /> : forma === 'estacao' ? <rect x="-8" y="-6" width="16" height="12" rx="2" fill={preench} /> : <rect x="-15" y="-9" width="30" height="18" rx="3" fill={preench} />}
                  {selecionado === d.id && <rect x="-19" y="-13" width="38" height="26" rx="5" fill="none" stroke={cor.selecao} strokeWidth="1.5" />}
                  {off && <text y="4" textAnchor="middle" className="dr-x">✕</text>}
                  <text y={forma === 'estacao' || forma === 'ap' ? 21 : 24} textAnchor="middle" className="dr-rotulo">{d.nome}</text>
                </g>
              );
            })}
          </svg>
          <ul className="dr-legenda" aria-label="Legenda">
            <li><i style={{ background: cor.descoberto }} />descoberto</li>
            <li><i style={{ background: cor.novo }} />descoberto agora</li>
            <li><i style={{ background: cor.apagado }} />não descoberto</li>
            <li><i style={{ background: cor.erro }} />desligado</li>
          </ul>
        </div>

        <aside className="dr-painel" aria-label="Painel">
          <section>
            <h3>E se desligar…</h3>
            <div className="dr-chips" role="group" aria-label="Equipamento a desligar">
              {DESLIGAVEIS.map((id) => <button key={id} className={falho === id ? 'ativo erro' : ''} onClick={() => setFalho((f) => (f === id ? null : id))}>{nome(id)}</button>)}
            </div>
            {impacto ? (
              <div className="dr-impacto" role="status">
                <p><b>{nome(falho!)}</b> desligado: {impacto.semConexao.length ? `${impacto.semConexao.length} equipamento(s) sem conexão com ${nome(ANCORA)}.` : 'ninguém perde a conexão com o servidor de arquivos.'}</p>
                {impacto.salasTotalmenteIsoladas.length > 0 && <p className="erro">Salas isoladas: {impacto.salasTotalmenteIsoladas.map((id) => SALAS.find((x) => x.id === id)?.nome ?? id).join(', ')}</p>}
                <p className="dr-nota">A descoberta tampouco enxerga: {naoVistos.length ? naoVistos.map((d) => d.nome).join(', ') : 'nada além do desligado'}.</p>
              </div>
            ) : <p className="dr-nota">Escolha um equipamento: a descoberta é refeita e o painel diz o que sumiu.</p>}
          </section>

          <section>
            <h3>Pacote até o {nome(ANCORA)}</h3>
            <p className="dr-nota">Selecione um equipamento no diagrama ({nome(selecionado)}).</p>
            {resultado && (
              <div role="status">
                <p className={resultado.status === 'entregue' ? 'ok' : 'erro'}>{resultado.status === 'entregue' ? 'Entregue' : 'Descartado'} em {resultado.totalMs.toFixed(3).replace('.', ',')} ms (soma dos trechos)</p>
                <ol className="dr-trilha">
                  {resultado.passos.map((p, i) => <li key={i}>{nome(p.de)} → {nome(p.para)}{p.motivo ? ` · ${p.motivo}` : ''}</li>)}
                </ol>
              </div>
            )}
          </section>

          <section>
            <h3>Limites</h3>
            <p className="dr-nota">Motor próprio de conectividade lógica: não executa o sistema dos equipamentos nem modela VLAN. A latência vem de 5 ns/m de cabo e só ordena rotas.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default DescobertaRede;
