import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import nock from 'nock';

import { setSession } from '../../../../modules/session';
import { QueryClientProviderWrapper } from '../../../../test/QueryClientProviderWrapper';
import { TestRouter } from '../../../../test/RouterWrapper';
import { parseDateTime } from '../../../../utils/datetime';
import { nockApi } from '../../../../utils/nock';
import { ProblemSetCreateDialog } from './ProblemSetCreateDialog';

describe('ProblemSetCreateDialog', () => {
  beforeEach(() => {
    setSession('token', { jid: 'userJid' });
  });

  test('create dialog form', async () => {
    await act(async () =>
      render(
        <QueryClientProviderWrapper>
          <TestRouter>
            <ProblemSetCreateDialog />
          </TestRouter>
        </QueryClientProviderWrapper>
      )
    );

    const user = userEvent.setup();

    const button = screen.getByRole('button');
    await user.click(button);

    const slug = screen.getByRole('textbox', { name: /^slug/i });
    await user.type(slug, 'new-problemSet');

    const name = screen.getByRole('textbox', { name: /name/i });
    await user.type(name, 'New problemSet');

    const archiveSlug = screen.getByRole('textbox', { name: /archive slug/i });
    await user.type(archiveSlug, 'New archive');

    const description = screen.getByRole('textbox', { name: /description/i });
    await user.type(description, 'New description');

    const contestTime = document.querySelector('input[name="contestTime"]');
    await user.clear(contestTime);
    await user.type(contestTime, '2100-01-01 00:00');

    nockApi()
      .post('/problemsets', {
        slug: 'new-problemSet',
        name: 'New problemSet',
        archiveSlug: 'New archive',
        description: 'New description',
        contestTime: parseDateTime('2100-01-01 00:00').getTime(),
      })
      .reply(200);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => expect(nock.isDone()).toBe(true));
  });

  test('create dialog with archive dropdown', async () => {
    nockApi()
      .get('/archives')
      .reply(200, {
        data: [{ id: 1, jid: 'JIDARCH1', slug: 'archive-1', name: 'Archive 1' }],
      });

    await act(async () =>
      render(
        <QueryClientProviderWrapper>
          <TestRouter>
            <ProblemSetCreateDialog />
          </TestRouter>
        </QueryClientProviderWrapper>
      )
    );

    const user = userEvent.setup();

    const button = screen.getByRole('button', { name: /new problemset/i });
    await user.click(button);

    await screen.findByText(/Archive 1 \(archive-1\)/);

    const slug = screen.getByRole('textbox', { name: /^slug/i });
    await user.type(slug, 'my-problemset');

    const name = screen.getByRole('textbox', { name: /name/i });
    await user.type(name, 'My Problemset');

    const contestTime = document.querySelector('input[name="contestTime"]');
    await user.clear(contestTime);
    await user.type(contestTime, '2100-01-01 00:00');

    nockApi()
      .post('/problemsets', {
        slug: 'my-problemset',
        name: 'My Problemset',
        archiveSlug: 'archive-1',
        contestTime: parseDateTime('2100-01-01 00:00').getTime(),
      })
      .reply(200);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => expect(nock.isDone()).toBe(true));
  });
});
