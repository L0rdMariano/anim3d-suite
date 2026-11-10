// Exemplo anim3d-app-ui · micro-interações em CSS 3D (sem WebGL, custo ~0 KB de JS extra).
// Cada peça é independente: copie só a que precisar (componente + bloco correspondente do CSS).
import { useEffect, useRef, useState, type JSX, type PointerEvent } from 'react';
import { entradaPorToque, useMovimentoReduzido } from '@anim3d/kit';
import './microInteracoes.css';

/** 1. Cartão que inclina (≤ 8°) seguindo o ponteiro, com brilho. Desligado em toque e movimento reduzido. */
export function CartaoInclinavel() {
  const ref = useRef<HTMLDivElement>(null);
  const reduzido = useMovimentoReduzido();
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reduzido || entradaPorToque()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 16}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
    el.style.setProperty('--brilho', '1');
  };
  const sair = () => {
    const el = ref.current;
    if (!el) return;
    for (const v of ['--rx', '--ry']) el.style.setProperty(v, '0deg');
    el.style.setProperty('--brilho', '0');
  };
  return (
    <div className="mi-palco" onPointerMove={mover} onPointerLeave={sair}>
      <div ref={ref} className="mi-inclina" aria-label="Cartão de exemplo">
        Cartão corporativo
        <div className="mi-chip" />
        <span className="mi-num">•••• 4021</span>
      </div>
    </div>
  );
}

/** 2. Cartão que vira (botão acessível: aria-pressed indica o lado). */
export function CartaoVirar() {
  const [virado, setVirado] = useState(false);
  return (
    <div className="mi-palco">
      <button className="mi-vira" aria-pressed={virado} onClick={() => setVirado((v) => !v)} aria-label={virado ? 'Plano Pro: detalhes' : 'Plano Pro: ver detalhes'}>
        <span className="mi-face">
          <span>
            Plano Pro<strong>R$ 249</strong>
            <small>clique para virar</small>
          </span>
        </span>
        <span className="mi-face mi-verso">
          <span>
            Usuários ilimitados
            <br />
            API e webhooks
            <br />
            Suporte prioritário
          </span>
        </span>
      </button>
    </div>
  );
}

/** 3. Botão com profundidade (estado pressionado físico). */
export function Botao3D() {
  return (
    <div className="mi-palco">
      <button className="mi-botao3d">Publicar</button>
    </div>
  );
}

/** Mostra o indicador só se a espera passar de `atraso` e o mantém por `minimo` (evita piscar). */
function useEsperaVisivel(ocupado: boolean, atraso = 400, minimo = 600) {
  const [visivel, setVisivel] = useState(false);
  const desde = useRef(0);
  useEffect(() => {
    if (ocupado) {
      const t = setTimeout(() => {
        desde.current = performance.now();
        setVisivel(true);
      }, atraso);
      return () => clearTimeout(t);
    }
    if (!visivel) return;
    const resta = Math.max(0, minimo - (performance.now() - desde.current));
    const t = setTimeout(() => setVisivel(false), resta);
    return () => clearTimeout(t);
  }, [ocupado, atraso, minimo, visivel]);
  return visivel;
}

/** 4. Salvar com loader de cubo CSS (salvamento simulado de 0,2 s a 2 s). */
export function SalvarComCubo() {
  const [ocupado, setOcupado] = useState(false);
  const [status, setStatus] = useState('');
  const cubo = useEsperaVisivel(ocupado);
  const salvar = () => {
    if (ocupado) return;
    setOcupado(true);
    setStatus('');
    const ms = 200 + Math.random() * 1800;
    setTimeout(() => {
      setOcupado(false);
      setStatus(`Salvo em ${(ms / 1000).toFixed(1)} s${ms < 400 ? ' (rápido: sem loader)' : ''}`);
    }, ms);
  };
  return (
    <div className="mi-palco">
      <div className="mi-salvar">
        <button onClick={salvar} aria-busy={ocupado}>
          {cubo && (
            <span className="mi-cubo" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} />
              ))}
            </span>
          )}
          {ocupado ? 'Salvando…' : 'Salvar cadastro'}
        </button>
        <span className="mi-status" role="status">
          {status}
        </span>
      </div>
    </div>
  );
}

/** 5. Pilha de cartões que abre em profundidade no hover/foco. */
export function PilhaCartoes() {
  return (
    <div className="mi-palco">
      <div className="mi-pilha" tabIndex={0} aria-label="Pilha de cartões: passe o mouse ou foque para abrir">
        <div className="mi-carta">Rascunho</div>
        <div className="mi-carta">Revisão</div>
        <div className="mi-carta">Publicado</div>
      </div>
    </div>
  );
}

export function MicroInteracoes() {
  const itens: [string, string, () => JSX.Element][] = [
    ['Inclinação com brilho', 'pointermove → CSS vars · ≤ 8°', CartaoInclinavel],
    ['Cartão que vira', 'preserve-3d · backface-visibility', CartaoVirar],
    ['Botão com profundidade', ':active · translateY + sombra', Botao3D],
    ['Loader de cubo', 'atraso 400 ms · mínimo 600 ms', SalvarComCubo],
    ['Pilha em profundidade', 'translateZ no hover/foco', PilhaCartoes],
  ];
  return (
    <div className="mi-grade">
      {itens.map(([nome, tecnica, Item]) => (
        <div className="mi-item" key={nome}>
          <Item />
          <strong>{nome}</strong>
          <small>{tecnica}</small>
        </div>
      ))}
    </div>
  );
}
