import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WalletProvider } from '@/components/wallet/wallet-context';
import { HolderGate } from './holder-gate';

function mockMeResponse(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
    })
  );
}

describe('HolderGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a connect prompt and hides children for a guest', async () => {
    mockMeResponse({ user: null });

    render(
      <WalletProvider>
        <HolderGate>
          <div>secret holder content</div>
        </HolderGate>
      </WalletProvider>
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByText('secret holder content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('renders children once signed in and holding the collection', async () => {
    mockMeResponse({
      user: {
        id: 'u1',
        walletAddress: '0.0.1234',
        username: null,
        pfpSerial: null,
        isAdmin: false,
      },
      holdsCollection: true,
      ownedSerials: [{ tokenId: '0.0.1', serial: 1 }],
    });

    render(
      <WalletProvider>
        <HolderGate>
          <div>secret holder content</div>
        </HolderGate>
      </WalletProvider>
    );

    await waitFor(() => expect(screen.getByText('secret holder content')).toBeInTheDocument());
  });

  it('prompts to connect when signed in but not holding the collection', async () => {
    mockMeResponse({
      user: {
        id: 'u1',
        walletAddress: '0.0.1234',
        username: null,
        pfpSerial: null,
        isAdmin: false,
      },
      holdsCollection: false,
      ownedSerials: [],
    });

    render(
      <WalletProvider>
        <HolderGate>
          <div>secret holder content</div>
        </HolderGate>
      </WalletProvider>
    );

    await waitFor(() =>
      expect(screen.getByText(/doesn't currently hold a Hedera Cyclops/i)).toBeInTheDocument()
    );
    expect(screen.queryByText('secret holder content')).not.toBeInTheDocument();
  });
});
