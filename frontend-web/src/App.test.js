import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renderiza el encabezado de inicio de sesión', () => {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <App />
    </MemoryRouter>
  );
  const heading = screen.getByRole('heading', { name: /Condominio/i });
  expect(heading).toBeInTheDocument();
});
