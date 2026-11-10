import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { Cena3DSegura } from '../src/Cena3DSegura';

const estado = vi.hoisted(() => ({ webgl: false, reduzido: false }));
vi.mock('../src/ambiente', async (original) => ({
  ...(await original<typeof import('../src/ambiente')>()),
  temWebGL: () => estado.webgl,
  useMovimentoReduzido: () => estado.reduzido,
}));

const carregar = () => Promise.resolve({ default: () => <p>cena 3D</p> });

afterEach(() => {
  cleanup();
  estado.webgl = false;
  estado.reduzido = false;
  vi.restoreAllMocks();
});

describe('Cena3DSegura', () => {
  it('sem WebGL mostra o fallback e não carrega a cena', async () => {
    render(<Cena3DSegura carregar={carregar} fallback={<p>poster</p>} rotulo="Fluxo de dados" />);
    await act(async () => {});
    expect(screen.getByText('poster')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Fluxo de dados' })).toBeTruthy();
    expect(screen.queryByText('cena 3D')).toBeNull();
  });

  it('sem rótulo é decorativa (aria-hidden)', () => {
    const { container } = render(<Cena3DSegura carregar={carregar} fallback={<p>poster</p>} />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('com WebGL e sem IntersectionObserver carrega a cena', async () => {
    estado.webgl = true;
    render(<Cena3DSegura carregar={carregar} fallback={<p>poster</p>} />);
    expect(await screen.findByText('cena 3D')).toBeTruthy();
  });

  it('movimento reduzido mostra a versão estática', async () => {
    estado.webgl = true;
    estado.reduzido = true;
    render(<Cena3DSegura carregar={carregar} fallback={<p>poster</p>} reduzido={<p>estático</p>} />);
    await act(async () => {});
    expect(screen.getByText('estático')).toBeTruthy();
    expect(screen.queryByText('cena 3D')).toBeNull();
  });

  it('ferramenta (cenaComMovimentoReduzido) carrega a cena e avisa que o movimento está reduzido', async () => {
    estado.webgl = true;
    estado.reduzido = true;
    const Cena = ({ movimentoReduzido }: { movimentoReduzido: boolean }) => <p>cena reduzida={String(movimentoReduzido)}</p>;
    render(<Cena3DSegura carregar={() => Promise.resolve({ default: Cena })} fallback={<p>poster</p>} cenaComMovimentoReduzido />);
    expect(await screen.findByText('cena reduzida=true')).toBeTruthy();
  });

  it('fallback como função recebe o motivo real', async () => {
    render(<Cena3DSegura carregar={carregar} fallback={(m) => <p>motivo:{m}</p>} />);
    await act(async () => {});
    expect(screen.getByText('motivo:sem-webgl')).toBeTruthy();
  });

  it('erro na cena volta ao fallback', async () => {
    estado.webgl = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const quebra = () =>
      Promise.resolve({
        default: (): never => {
          throw new Error('shader');
        },
      });
    render(<Cena3DSegura carregar={quebra} fallback={<p>poster</p>} />);
    await act(async () => {});
    expect(screen.getByText('poster')).toBeTruthy();
  });
});
