import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FlowStateGraph } from '../components/FlowStateGraph';

const makeStates = () => [
  { code: 'draft', name: 'Draft', is_initial: true, is_terminal: false, color: '#3b82f6' },
  { code: 'review', name: 'Review', is_initial: false, is_terminal: false, color: '#eab308' },
  { code: 'done', name: 'Done', is_initial: false, is_terminal: true, color: '#22c55e' },
];

const makeTransitions = () => [
  { code: 'submit', name: 'Submit', from_state: 'draft', to_state: 'review' },
  { code: 'approve', name: 'Approve', from_state: 'review', to_state: 'done' },
];

describe('FlowStateGraph', () => {
  describe('Given an empty state list', () => {
    it('When no states / Then renders nothing', () => {
      const { container } = render(
        <FlowStateGraph states={[]} transitions={[]} currentState="" />
      );
      expect(container.querySelector('svg')).toBeNull();
    });
  });

  describe('Given states and transitions', () => {
    it('When rendered / Then creates SVG element', () => {
      const { container } = render(
        <FlowStateGraph states={makeStates()} transitions={makeTransitions()} currentState="draft" />
      );
      expect(container.querySelector('svg')).not.toBeNull();
    });

    it('When rendered / Then shows state labels', () => {
      const { container } = render(
        <FlowStateGraph states={makeStates()} transitions={makeTransitions()} currentState="draft" />
      );
      const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
      expect(texts).toContain('Draft');
      expect(texts).toContain('Review');
      expect(texts).toContain('Done');
    });

    it('When rendered / Then shows initial label on initial state', () => {
      const { container } = render(
        <FlowStateGraph states={makeStates()} transitions={makeTransitions()} currentState="review" />
      );
      const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
      expect(texts).toContain('initial');
    });

    it('When rendered / Then shows terminal label on terminal state', () => {
      const { container } = render(
        <FlowStateGraph states={makeStates()} transitions={makeTransitions()} currentState="review" />
      );
      const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
      expect(texts).toContain('terminal');
    });

    it('When current state is set / Then highlights that node with thicker stroke', () => {
      const { container } = render(
        <FlowStateGraph states={makeStates()} transitions={makeTransitions()} currentState="draft" />
      );
      const rects = container.querySelectorAll('rect');
      const hasThick = Array.from(rects).some(r => r.getAttribute('stroke-width') === '2');
      expect(hasThick).toBe(true);
    });

    it('When visited states are provided / Then marks them with green', () => {
      const { container } = render(
        <FlowStateGraph
          states={makeStates()}
          transitions={makeTransitions()}
          currentState="done"
          visitedStates={['draft', 'review']}
        />
      );
      const rects = container.querySelectorAll('rect');
      const fills = Array.from(rects).map(r => r.getAttribute('fill'));
      expect(fills.some(f => f && f.includes('1a2f1a'))).toBe(true);
    });

    it('When transition lines are rendered / Then creates line elements', () => {
      const { container } = render(
        <FlowStateGraph states={makeStates()} transitions={makeTransitions()} currentState="draft" />
      );
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('Given a self-loop transition', () => {
    it('When from_state equals to_state / Then renders path arc', () => {
      const states = [{ code: 'loop', name: 'Loop', is_initial: true, is_terminal: false, color: '#3b82f6' }];
      const transitions = [{ code: 'retry', name: 'Retry', from_state: 'loop', to_state: 'loop' }];
      const { container } = render(
        <FlowStateGraph states={states} transitions={transitions} currentState="loop" />
      );
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Given many states', () => {
    it('When more than 6 states / Then packs into column layout', () => {
      const states = Array.from({ length: 8 }, (_, i) => ({
        code: `s${i}`, name: `State ${i}`, is_initial: i === 0, is_terminal: i === 7, color: '#3b82f6',
      }));
      const transitions = states.slice(1).map((s, i) => ({
        code: `t${i}`, name: `T${i}`, from_state: states[i].code, to_state: s.code,
      }));
      const { container } = render(
        <FlowStateGraph states={states} transitions={transitions} currentState="s0" />
      );
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });

  describe('Given long state name', () => {
    it('When name exceeds 14 chars / Then truncates with ellipsis', () => {
      const states = [{ code: 's1', name: 'Very Long State Name Here', is_initial: true, is_terminal: false, color: '#3b82f6' }];
      const { container } = render(
        <FlowStateGraph states={states} transitions={[]} currentState="s1" />
      );
      const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
      expect(texts.some(t => t && t.includes('…'))).toBe(true);
    });
  });
});
