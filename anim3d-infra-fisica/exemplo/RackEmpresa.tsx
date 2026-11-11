// Exemplo anim3d-infra-fisica · Rack de uma empresa de médio porte (42 U, 3 andares): cabo animado até a tomada, queda de equipamento,
// validação de projeto e inventário. Toda a tela é calculada pelos motores (infra-fisica, rede-logica, infra-validacao).
import { useMemo, useState } from 'react';
import { Cena3DSegura } from '@anim3d/kit';
import { comprimentoTrechos, ocupacaoRack, rastrearCaminhoFisico, U_METROS } from '../motor/infraFisica';
import { gerarTopologiaLogica, impactoDeFalha } from '../../anim3d-rede-logica/motor/redeLogica';
import { inventario, validarProjeto } from '../../anim3d-infra-validacao/motor/validacao';
import { comDefeitos, empresaMedioPorte, ipsDaEmpresa, pontosDeRede, RACK, resumoRack, salaDeEquip, SALAS } from './empresaDados';
import type { PropsRack3D, VistaRack } from './RackEmpresa3DCena';
import './rackEmpresa.css';

const carregar3d = () => import('./RackEmpresa3DCena'); // three só carrega quando a vista 3D é usada
const ANCORA = 'arq'; // "perder a conexão" = perder o servidor de arquivos
const DESLIGAVEIS = ['core', 'acc1', 'acc2', 'fw', 'rt', 'arq', 'ad'];
const metros = (n: number) => `${n.toFixed(1).replace('.', ',')} m`;
const nomeSala = (id: string) => SALAS.find((s) => s.id === id)?.nome ?? id;

/** Elevação frontal em SVG: fallback sem WebGL e leitura rápida do mapa de U. */
function Elevacao({ modelo, selecionado, desligado, aoSelecionar }: { modelo: PropsRack3D['modelo']; selecionado: string | null; desligado: string | null; aoSelecionar: (id: string) => void }) {
  const U = 14;
  const o = ocupacaoRack(RACK, modelo.instalacoes, modelo.equipamentos);
  return (
    <svg className="ri-elev" viewBox={`0 0 300 ${RACK.totalU * U + 10}`} role="group" aria-label="Elevação frontal do rack de 42 U">
      {Array.from({ length: RACK.totalU }, (_, i) => (
        <g key={i}>
          <rect x="40" y={5 + (RACK.totalU - 1 - i) * U} width="250" height={U - 1} className="ri-u" />
          <text x="34" y={5 + (RACK.totalU - 1 - i) * U + 10} className="ri-un" textAnchor="end">{i + 1}</text>
        </g>
      ))}
      {modelo.instalacoes.map((ins) => {
        const e = modelo.equipamentos.find((x) => x.id === ins.equipamentoId)!;
        const y = 5 + (RACK.totalU - (ins.uInicial - 1 + e.alturaU)) * U;
        return (
          <g key={e.id} role="button" tabIndex={0} aria-label={`${e.nome}, U${ins.uInicial}`} className={`ri-eq ${e.tipo} ${selecionado === e.id ? 'sel' : ''} ${desligado === e.id ? 'off' : ''}`} onClick={() => aoSelecionar(e.id)} onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && aoSelecionar(e.id)}>
            <rect x="42" y={y + 1} width="246" height={e.alturaU * U - 3} rx="2" />
            <text x="50" y={y + e.alturaU * U / 2 + 4}>{e.nome}</text>
          </g>
        );
      })}
      {o.conflitos.map((c) => <rect key={c.u} x="40" y={5 + (RACK.totalU - c.u) * U} width="250" height={U - 1} className="ri-conflito" />)}
    </svg>
  );
}

export function RackEmpresa() {
  const base = useMemo(() => empresaMedioPorte(), []);
  const [defeitos, setDefeitos] = useState(false);
  const modelo = useMemo(() => (defeitos ? comDefeitos(base) : base), [defeitos, base]);
  const [vista, setVista] = useState<VistaRack>('rack');
  const [ponto, setPonto] = useState<string | null>('pc-2-1');
  const [reproducao, setReproducao] = useState(0);
  const [desligado, setDesligado] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const pontos = useMemo(() => pontosDeRede(modelo), [modelo]);
  const caminho = useMemo(() => (ponto ? rastrearCaminhoFisico(modelo, ponto) : null), [modelo, ponto]);
  const achados = useMemo(() => validarProjeto(modelo), [modelo]);
  const topo = useMemo(() => gerarTopologiaLogica(modelo, ipsDaEmpresa(modelo)), [modelo]);
  const impacto = useMemo(() => (desligado ? impactoDeFalha(topo, desligado, ANCORA, salaDeEquip(modelo)) : null), [desligado, topo, modelo]);
  const resumo = useMemo(() => resumoRack(modelo), [modelo]);
  const inv = useMemo(() => inventario(modelo), [modelo]);
  const nome = (id: string) => modelo.equipamentos.find((e) => e.id === id)?.nome ?? id;

  const marcados = useMemo(() => {
    const ids = new Set(achados.map((a) => a.objeto));
    for (const a of achados) for (const e of modelo.equipamentos) if (a.mensagem.includes(e.nome)) ids.add(e.id);
    return [...ids];
  }, [achados, modelo]);

  const selecionar = (id: string) => setSelecionado((s) => (s === id ? null : id));
  const tocar = (id: string) => { setPonto(id); setReproducao((n) => n + 1); };

  const props3d: Omit<PropsRack3D, never> = { modelo, vista, caminho, reproducao, desligado, isolados: impacto?.semConexao ?? [], salasIsoladas: impacto?.salasTotalmenteIsoladas ?? [], marcados, selecionado, aoSelecionar: selecionar };
  const fallback = <Elevacao modelo={modelo} selecionado={selecionado} desligado={desligado} aoSelecionar={selecionar} />;
  const sel = selecionado ? modelo.equipamentos.find((e) => e.id === selecionado) : null;
  const selIns = sel ? modelo.instalacoes.find((i) => i.equipamentoId === sel.id) : null;

  return (
    <div className="ri-raiz">
     <div className="ri-corpo">
      <div className="ri-palco">
        <div className="ri-barra" role="group" aria-label="Vista">
          <button className={vista === 'rack' ? 'ativo' : ''} onClick={() => setVista('rack')}>Rack 42 U</button>
          <button className={vista === 'predio' ? 'ativo' : ''} onClick={() => setVista('predio')}>Prédio · 3 andares</button>
          <span className="ri-dica">arraste para girar · Ctrl + roda dá zoom</span>
        </div>
        <Cena3DSegura<Omit<PropsRack3D, 'aoFalhar'>>
          className="ri-vista3d"
          carregar={carregar3d}
          props={props3d}
          fallback={fallback}
          cenaComMovimentoReduzido
          rotulo="Rack de TI de uma empresa de médio porte e prédio de três andares, em 3D"
          aspecto="16 / 11"
          margem="0px"
        />
      </div>

      <aside className="ri-painel" aria-label="Painel do projeto">
        <section>
          <h3>RACK-01 <small>empresa de ~120 pessoas</small></h3>
          <dl className="ri-metricas">
            <div><dt>U usados</dt><dd>{resumo.ocupados}/{RACK.totalU}</dd></div>
            <div><dt>Energia</dt><dd className={resumo.watts > RACK.capacidadeW ? 'erro' : resumo.watts > 0.8 * RACK.capacidadeW ? 'aviso' : ''}>{resumo.watts} W <small>de {RACK.capacidadeW}</small></dd></div>
            <div><dt>Cabos</dt><dd>{resumo.cabos}</dd></div>
            <div><dt>Metros</dt><dd>{resumo.metrosDeCabo}</dd></div>
          </dl>
          <p className="ri-nota">Rack completo; dos ~120 pontos de rede, o modelo documenta uma <b>amostra</b> de 9 estações e 3 APs.</p>
        </section>

        <section>
          <h3>Caminho do cabo</h3>
          <div className="ri-chips" role="group" aria-label="Ponto de rede">
            {pontos.map((p) => <button key={p.pc} className={ponto === p.pc ? 'ativo' : ''} onClick={() => tocar(p.pc)}>{p.nome}</button>)}
          </div>
          {caminho && (
            <>
              <ol className="ri-trilha">
                {caminho.cabos.map((c, i) => (
                  <li key={c.id}>
                    <b>{nome(caminho.equipamentos[i])}</b> → <b>{nome(caminho.equipamentos[i + 1])}</b>
                    <span> porta {c.para.equipamentoId === caminho.equipamentos[i + 1] ? c.para.porta : c.de.porta} · {metros(comprimentoTrechos(c.caminho))}</span>
                  </li>
                ))}
              </ol>
              <p className={`ri-canal ${caminho.canalM > 100 ? 'erro' : ''}`}>
                Canal: <b>{metros(caminho.canalM)}</b> de 100 m {caminho.fim ? `· termina em ${nome(caminho.fim)}` : '· ponta solta'}
              </p>
              <button className="ri-acao" onClick={() => setReproducao((n) => n + 1)}>▶ Reproduzir</button>
            </>
          )}
        </section>

        <section>
          <h3>E se desligar…</h3>
          <div className="ri-chips" role="group" aria-label="Equipamento a desligar">
            {DESLIGAVEIS.map((id) => <button key={id} className={desligado === id ? 'ativo erro' : ''} onClick={() => setDesligado((d) => (d === id ? null : id))}>{nome(id)}</button>)}
          </div>
          {impacto ? (
            <div className="ri-impacto" role="status">
              <p><b>{nome(desligado!)}</b> desligado: {impacto.semConexao.length ? <>{impacto.semConexao.length} estação(ões)/servidor(es) sem conexão com <b>{nome(ANCORA)}</b>.</> : 'ninguém perde a conexão.'}</p>
              {impacto.salasTotalmenteIsoladas.length > 0 && <p className="erro">Isoladas: {impacto.salasTotalmenteIsoladas.map(nomeSala).join(', ')}</p>}
              {impacto.semConexao.length > 0 && <p className="ri-nota">{impacto.semConexao.map(nome).join(', ')}</p>}
            </div>
          ) : (
            <p className="ri-nota">Escolha um equipamento para ver quem perde a conexão.</p>
          )}
        </section>

        <section>
          <h3>Validação do projeto <small>{achados.length ? `${achados.length} achado(s)` : 'sem achados'}</small></h3>
          <label className="ri-toggle"><input type="checkbox" checked={defeitos} onChange={(e) => setDefeitos(e.target.checked)} /> Injetar defeitos de projeto</label>
          {achados.length === 0 ? <p className="ri-nota ok">Rack consistente: sem sobreposição, energia a {Math.round((resumo.watts / RACK.capacidadeW) * 100)}% e todos os canais abaixo de 100 m.</p> : (
            <ul className="ri-achados">
              {achados.map((a, i) => <li key={i} className={a.severidade}><b>{a.severidade}</b> {a.mensagem}</li>)}
            </ul>
          )}
        </section>

        {sel && selIns && (
          <section>
            <h3>{sel.nome}</h3>
            <p className="ri-nota">{sel.tipo} · U{selIns.uInicial}{sel.alturaU > 1 ? `–${selIns.uInicial + sel.alturaU - 1}` : ''} · {sel.potenciaW} W · {sel.portas} portas · {(sel.alturaU * U_METROS * 1000).toFixed(0)} mm de altura</p>
          </section>
        )}

        <details>
          <summary>Inventário ({inv.length} itens)</summary>
          <table className="ri-tabela">
            <thead><tr><th>Item</th><th>Rack</th><th>U</th><th>W</th><th>Portas</th></tr></thead>
            <tbody>{inv.map((r) => <tr key={r.id}><td>{r.nome}</td><td>{r.rack}</td><td>{r.u}</td><td>{r.potenciaW}</td><td>{r.portasUsadas}/{r.portas}</td></tr>)}</tbody>
          </table>
        </details>
      </aside>
     </div>
    </div>
  );
}

export default RackEmpresa;
