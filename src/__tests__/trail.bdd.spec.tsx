import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CombScope, DetailPageTemplate, ListPageTemplate } from '@so360/design-system';

// Trail contract for the Flow module: the CombScope root crumb (Flow) is
// prepended to every page trail, and sub-pages show their parent list as a crumb.
const root = { label: 'Flow', to: '/flow' };

const renderInScope = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <CombScope module="flow" root={root} navigate={() => undefined}>
        {ui}
      </CombScope>
    </MemoryRouter>,
  );

describe('Flow page trail', () => {
  it('Given a top-level page with an empty trail, When it renders, Then the module root crumb is shown', () => {
    renderInScope(<ListPageTemplate trail={[]} title="Pending Approvals"><div /></ListPageTemplate>);
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });

  it('Given a sub-page whose trail names its parent list, When it renders, Then the parent crumb and module root crumb are shown', () => {
    renderInScope(
      <DetailPageTemplate trail={[{ label: 'Instances', to: '/flow/instances' }]} title="Instance">
        <div />
      </DetailPageTemplate>,
    );
    expect(screen.getByText('Flow')).toBeInTheDocument();
    expect(screen.getByText('Instances')).toBeInTheDocument();
  });
});
