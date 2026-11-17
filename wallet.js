/*
=========================================================
SCPM Studio — Universal Wallet Bridge
Build: 2026-10

ETH:
  - EIP-6963 multi-wallet discovery
  - EIP-1193 fallback (Brave Wallet, MetaMask, etc.)
  - works with any injected Ethereum wallet implementing the standard

BTC / Ordinals:
  - WBIP-compatible providers via window.btc_providers
  - Xverse provider
  - UniSat provider
  - stores both payment + Ordinals address when available

IMPORTANT:
  - This file never asks for seed phrases/private keys.
  - Connecting a wallet is NOT the same as cryptographically proving ownership.
    Production login/linking should use a wallet signature challenge (SIWE/WBIP).
=========================================================
*/
(function () {
  'use strict';

  const ETH_CHAIN_ID = '0x1';
  const BTC_MAINNET_NAMES = ['mainnet', 'bitcoin mainnet', 'livenet'];

  const state = {
    ethProviders: [],
    selectedEth: null,
    btcProviders: []
  };

  function $(id) { return document.getElementById(id); }

  function showMessage(text, isError) {
    const el = $('accountMessage');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }

  function shortAddress(address) {
    if (!address) return 'Not connected';
    return address.length > 16 ? address.slice(0, 8) + '…' + address.slice(-6) : address;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    }[c]));
  }

  function ensureWalletUI() {
    const btn = $('walletBtn');
    if (!btn || btn.dataset.universalWalletUi === '1') return;

    btn.dataset.universalWalletUi = '1';
    btn.textContent = 'Connect Ethereum wallet';

    // Создаем кнопку для отвязки кошелька (скрыта по умолчанию)
    const unlinkBtn = document.createElement('button');
    unlinkBtn.id = 'unlinkWalletBtn';
    unlinkBtn.className = 'danger'; // используем стили для красной кнопки
    unlinkBtn.type = 'button';
    unlinkBtn.textContent = 'Отвязать кошелек';
    unlinkBtn.style.marginTop = '8px';
    unlinkBtn.style.display = 'none'; // Показываем только когда кошелек привязан
    btn.insertAdjacentElement('afterend', unlinkBtn);

    // BTC кнопка
    const btcBtn = document.createElement('button');
    btcBtn.id = 'btcWalletBtn';
    btcBtn.className = btn.className || 'secondary';
    btcBtn.type = 'button';
    btcBtn.textContent = 'Connect Bitcoin / Ordinals wallet';
    btcBtn.style.marginTop = '8px';
    unlinkBtn.insertAdjacentElement('afterend', btcBtn);

    const btcBox = document.createElement('div');
    btcBox.id = 'btcWalletValue';
    btcBox.className = 'profile-line';
    btcBox.style.marginTop = '8px';
    btcBox.innerHTML = '<span>BTC / Ordinals</span><strong>Not connected</strong>';
    btcBtn.insertAdjacentElement('afterend', btcBox);

    // Обработчик для кнопки ETH (Подключить / Сменить)
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await connectEthereum(); }
      catch (e) { showMessage(normalizeError(e), true); }
      finally { btn.disabled = false; }
    });

    // Обработчик для кнопки отвязки
    unlinkBtn.addEventListener('click', async () => {
      if (!confirm('Вы уверены, что хотите отвязать Ethereum кошелек?')) return;
      unlinkBtn.disabled = true;
      try { await unlinkEthereum(); }
      catch (e) { showMessage(normalizeError(e), true); }
      finally { unlinkBtn.disabled = false; }
    });

    // BTC обработчик
    btcBtn.addEventListener('click', async () => {
      btcBtn.disabled = true;
      try { await connectBitcoin(); }
      catch (e) { showMessage(normalizeError(e), true); }
      finally { btcBtn.disabled = false; }
    });

    restoreSavedWallets();
  }

  function normalizeError(error) {
    if (!error) return 'Wallet connection failed.';
    if (error.code === 4001) return 'Connection was rejected in the wallet.';
    if (error.code === -32002) return 'The wallet already has a connection request open. Check the wallet extension.';
    return error.message || String(error);
  }

  async function currentUser() {
    if (!window.scpmSupabase) throw new Error('Supabase is not connected.');
    const { data, error } = await window.scpmSupabase.auth.getSession();
    if (error) throw error;
    const user = data && data.session && data.session.user;
    if (!user) throw new Error('Sign in to your SCPM account first.');
    return user;
  }

  /* -----------------------------------------------------
     ETHEREUM — EIP-6963 discovery
  ----------------------------------------------------- */
  function discoverEthereumProviders(timeoutMs) {
    return new Promise(resolve => {
      const found = new Map();

      function add(detail) {
        const info = detail && detail.info;
        const provider = detail && detail.provider;
        if (!provider) return;
        const key = info && (info.rdns || info.uuid || info.name) || ('provider-' + found.size);
        if (!found.has(key)) found.set(key, { info: info || {}, provider });
      }

      const handler = event => add(event.detail);
      window.addEventListener('eip6963:announceProvider', handler);

      try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (_) {}

      setTimeout(() => {
        window.removeEventListener('eip6963:announceProvider', handler);

        if (window.ethereum) {
          const providers = Array.isArray(window.ethereum.providers)
            ? window.ethereum.providers
            : [window.ethereum];

          providers.forEach((provider, index) => {
            if (!provider) return;
            let name = provider.isMetaMask ? 'MetaMask' :
                       provider.isBraveWallet ? 'Brave Wallet' :
                       provider.isCoinbaseWallet ? 'Coinbase Wallet' :
                       provider.isRabby ? 'Rabby' :
                       'Ethereum Wallet';
            const key = 'legacy:' + name + ':' + index;
            if (!found.has(key)) found.set(key, {
              info: { name, rdns: key, uuid: key }, provider
            });
          });
        }

        state.ethProviders = Array.from(found.values());
        resolve(state.ethProviders);
      }, timeoutMs || 250);
    });
  }

  function ethProviderName(item) {
    return item && item.info && item.info.name ? item.info.name : 'Ethereum Wallet';
  }

  async function chooseEthereumProvider() {
    const providers = await discoverEthereumProviders(300);
    if (!providers.length) {
      throw new Error('Ethereum wallet not found. Install or enable a browser wallet such as Brave Wallet, MetaMask, Rabby or another EIP-1193 wallet.');
    }

    if (providers.length === 1) { state.selectedEth = providers[0]; return providers[0].provider; }

    const text = providers.map((p, i) => (i + 1) + '. ' + ethProviderName(p)).join('\n');
    const answer = window.prompt('Choose Ethereum wallet:\n\n' + text + '\n\nEnter number:');
    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || !providers[index]) {
      throw new Error('Ethereum wallet selection cancelled.');
    }
    state.selectedEth = providers[index];
    return providers[index].provider;
  }

  async function ensureEthereumMainnet(provider) {
    const chainId = await provider.request({ method: 'eth_chainId' });
    if (String(chainId).toLowerCase() === ETH_CHAIN_ID) return;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ETH_CHAIN_ID }]
      });
    } catch (e) {
      if (e && (e.code === 4902 || e.code === -32602)) {
        throw new Error('The wallet is not on Ethereum Mainnet. Switch it to Ethereum Mainnet manually.');
      }
      throw e;
    }
  }

  async function saveEthereumAddress(user, address, walletName) {
    const payload = {
      id: user.id,
      email: user.email || null,
      wallet_address: address,
      wallet_verified_at: null, // Смена кошелька сбрасывает верификацию
      updated_at: new Date().toISOString()
    };

    const { error } = await window.scpmSupabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw new Error('Supabase could not save wallet_address: ' + error.message);

    const check = await window.scpmSupabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', user.id)
      .maybeSingle();
    if (check.error) throw new Error('Wallet was submitted, but Supabase could not verify it: ' + check.error.message);
    if (!check.data || String(check.data.wallet_address || '').toLowerCase() !== String(address).toLowerCase()) {
      throw new Error('Supabase did not retain wallet_address. Check the profiles table permissions/policies and wallet_address column.');
    }

    localStorage.setItem('scpm_eth_wallet_' + user.id, JSON.stringify({
      address, walletName: walletName || 'Ethereum Wallet', savedAt: Date.now()
    }));
  }

  async function saveWalletVerifiedAt(user, address) {
    const client = window.scpmSupabase;
    const verifiedAt = new Date().toISOString();
    const { data, error } = await client
      .from('profiles')
      .update({ wallet_verified_at: verifiedAt, updated_at: verifiedAt })
      .eq('id', user.id)
      .ilike('wallet_address', address)
      .select('wallet_address,wallet_verified_at')
      .maybeSingle();

    if (error) {
      throw new Error('Signature verified, but Supabase could not save wallet_verified_at: ' + error.message);
    }
    if (!data || String(data.wallet_address || '').toLowerCase() !== String(address).toLowerCase() || !data.wallet_verified_at) {
      throw new Error('Signature verified, but Supabase did not confirm the wallet_verified_at update. Check profiles UPDATE policy and wallet_address.');
    }
    return data.wallet_verified_at;
  }

  /* -----------------------------------------------------
     ETHEREUM OWNERSHIP VERIFICATION — server challenge
  ----------------------------------------------------- */
  async function verifyEthereumOwnership(provider, address) {
    const client = window.scpmSupabase;
    if (!client || !client.functions) {
      throw new Error('Supabase Functions client is unavailable.');
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error('Could not read the Supabase session: ' + sessionError.message);
    const session = sessionData && sessionData.session;
    if (!session || !session.access_token) {
      throw new Error('Your SCPM session is missing. Sign in again and retry wallet verification.');
    }

    const challengeResult = await client.functions.invoke('verify-wallet-signature', {
      body: { action: 'challenge', walletAddress: address }
    });
    if (challengeResult.error) {
      throw new Error('Could not create wallet verification challenge: ' +
        (challengeResult.error.message || String(challengeResult.error)));
    }

    const challenge = challengeResult.data || {};
    const challengeId = challenge.challengeId || challenge.challenge_id || challenge.id;
    const message = challenge.message;
    if (!challengeId || !message) {
      throw new Error('The verification function returned no challengeId or message. Check its response format.');
    }

    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address]
    });
    if (!signature || typeof signature !== 'string') {
      throw new Error('The wallet did not return a signature.');
    }

    const verifyResult = await client.functions.invoke('verify-wallet-signature', {
      body: {
        action: 'verify',
        walletAddress: address,
        challengeId,
        signature
      }
    });
    if (verifyResult.error) {
      throw new Error('The server could not verify the wallet signature: ' +
        (verifyResult.error.message || String(verifyResult.error)));
    }

    const verification = verifyResult.data || {};
    if (verification.verified !== true) {
      throw new Error(verification.message || 'The server did not confirm wallet ownership.');
    }
    return verification;
  }

  async function connectEthereum() {
    const user = await currentUser();
    const provider = await chooseEthereumProvider();
    const walletName = state.selectedEth ? ethProviderName(state.selectedEth) : 'Ethereum Wallet';

    if (!provider || typeof provider.request !== 'function') {
      throw new Error('Selected Ethereum wallet does not expose an EIP-1193 provider.');
    }

    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const address = accounts && accounts[0];
    if (!address) throw new Error('No Ethereum account selected.');

    await ensureEthereumMainnet(provider);

    await saveEthereumAddress(user, address, walletName);
    
    let verifiedAt;
    try {
      await verifyEthereumOwnership(provider, address);
      verifiedAt = await saveWalletVerifiedAt(user, address);
    } catch (verificationError) {
      const detail = normalizeError(verificationError);
      showMessage('Кошелек подключен, но верификация не пройдена: ' + detail, true);
      throw verificationError;
    }

    // Обновляем UI
    if ($('walletValue')) $('walletValue').textContent = shortAddress(address) + ' · ' + walletName + ' · Ownership verified';
    showMessage('Ethereum кошелек успешно обновлен и верифицирован.');

    // Показываем кнопку "Отвязать"
    const unlinkBtn = $('unlinkWalletBtn');
    if (unlinkBtn) unlinkBtn.style.display = 'block';
    
    // Меняем текст главной кнопки
    const btn = $('walletBtn');
    if (btn) btn.textContent = 'Сменить Ethereum кошелек';

    return address;
  }

  /* -----------------------------------------------------
     ОТВЯЗКА ETHEREUM КОШЕЛЬКА
  ----------------------------------------------------- */
  async function unlinkEthereum() {
    const user = await currentUser();
    
    const { error } = await window.scpmSupabase
      .from('profiles')
      .update({ wallet_address: null, wallet_verified_at: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw new Error('Не удалось отвязать кошелек в БД: ' + error.message);

    localStorage.removeItem('scpm_eth_wallet_' + user.id);

    if ($('walletValue')) $('walletValue').textContent = 'Not connected';
    
    const btn = $('walletBtn');
    if (btn) btn.textContent = 'Connect Ethereum wallet';
    
    const unlinkBtn = $('unlinkWalletBtn');
    if (unlinkBtn) unlinkBtn.style.display = 'none';

    showMessage('Ethereum кошелек успешно отвязан.');
  }

  /* -----------------------------------------------------
     BITCOIN / ORDINALS
  ----------------------------------------------------- */
  function collectBitcoinProviders() {
    const list = [];
    const seen = new Set();

    function add(name, provider, kind) {
      if (!provider || typeof provider.request !== 'function') return;
      if (seen.has(provider)) return;
      seen.add(provider);
      list.push({ name, provider, kind });
    }

    const wbip = window.btc_providers || window.webbtc_providers;
    if (Array.isArray(wbip)) {
      wbip.forEach((entry, i) => {
        if (entry && typeof entry.request === 'function') {
          add(entry.name || ('Bitcoin Wallet ' + (i + 1)), entry, 'wbip');
        }
      });
    }

    if (window.XverseProviders) {
      const xp = window.XverseProviders.BitcoinProvider || window.XverseProviders;
      add('Xverse Wallet', xp, 'xverse');
    }

    if (window.unisat) add('UniSat', window.unisat, 'unisat');

    if (window.bitcoin && typeof window.bitcoin.request === 'function') {
      add('Bitcoin Wallet', window.bitcoin, 'generic');
    }

    state.btcProviders = list;
    return list;
  }

  async function connectWbip(provider, walletName) {
    if (typeof provider.request === 'function') {
      let result;
      try {
        result = await provider.request('wallet_connect', {
          addresses: ['ordinals', 'payment'],
          network: 'Mainnet',
          message: 'Connect your SCPM Studio Bitcoin / Ordinals wallet.'
        });
      } catch (_) {
        result = await provider.request({
          method: 'wallet_connect',
          params: {
            addresses: ['ordinals', 'payment'],
            network: 'Mainnet',
            message: 'Connect your SCPM Studio Bitcoin / Ordinals wallet.'
          }
        });
      }

      const resultObj = result && result.result ? result.result : result;
      const addresses = resultObj && (resultObj.addresses || resultObj.addressses);
      if (Array.isArray(addresses) && addresses.length) {
        return {
          walletName,
          ordinals: addresses.find(a => a.purpose === 'ordinals')?.address || null,
          payment: addresses.find(a => a.purpose === 'payment')?.address || null,
          raw: resultObj
        };
      }
    }
    throw new Error(walletName + ' did not return Bitcoin addresses.');
  }

  async function connectXverse(provider) {
    const result = await provider.request('wallet_connect', {
      addresses: ['ordinals', 'payment'],
      network: 'Mainnet',
      message: 'Connect your SCPM Studio Bitcoin / Ordinals wallet.'
    });
    const resultObj = result && result.result ? result.result : result;
    const addresses = resultObj && (resultObj.addresses || resultObj.addressses);
    if (!Array.isArray(addresses) || !addresses.length) throw new Error('Xverse returned no Bitcoin addresses.');
    return {
      walletName: 'Xverse Wallet',
      ordinals: addresses.find(a => a.purpose === 'ordinals')?.address || null,
      payment: addresses.find(a => a.purpose === 'payment')?.address || null,
      raw: resultObj
    };
  }

  async function connectUniSat(provider) {
    const accounts = await provider.requestAccounts();
    const payment = Array.isArray(accounts) ? accounts[0] : accounts;
    if (!payment) throw new Error('No UniSat Bitcoin account selected.');

    let network = null;
    try { network = await provider.getNetwork(); } catch (_) {}
    if (network && String(network).toLowerCase() !== 'livenet') {
      try { await provider.switchNetwork('livenet'); }
      catch (_) { throw new Error('UniSat is not on Bitcoin Mainnet. Switch UniSat to Bitcoin Mainnet.'); }
    }
    return { walletName: 'UniSat', ordinals: payment, payment, raw: { network } };
  }

  async function chooseBitcoinProvider() {
    const providers = collectBitcoinProviders();
    if (!providers.length) {
      throw new Error('Bitcoin / Ordinals wallet not found. Install or enable a compatible wallet such as Xverse or UniSat.');
    }
    if (providers.length === 1) return providers[0];

    const text = providers.map((p, i) => (i + 1) + '. ' + p.name).join('\n');
    const answer = window.prompt('Choose Bitcoin / Ordinals wallet:\n\n' + text + '\n\nEnter number:');
    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || !providers[index]) throw new Error('Bitcoin wallet selection cancelled.');
    return providers[index];
  }

  async function saveBitcoinAddress(user, result) {
    const record = {
      ordinals: result.ordinals || null,
      payment: result.payment || null,
      walletName: result.walletName || 'Bitcoin Wallet',
      savedAt: Date.now()
    };
    localStorage.setItem('scpm_btc_wallet_' + user.id, JSON.stringify(record));
    try {
      const { error } = await window.scpmSupabase
        .from('profiles')
        .update({ btc_wallet_address: record.ordinals || record.payment, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error && !/btc_wallet_address/i.test(error.message || '')) throw error;
    } catch (e) {
      if (!/btc_wallet_address/i.test(e.message || '')) throw e;
    }
  }

  async function connectBitcoin() {
    const user = await currentUser();
    const selected = await chooseBitcoinProvider();
    let result;

    if (selected.kind === 'unisat') result = await connectUniSat(selected.provider);
    else if (selected.kind === 'xverse') result = await connectXverse(selected.provider);
    else result = await connectWbip(selected.provider, selected.name);

    await saveBitcoinAddress(user, result);
    renderBitcoinAddress(result);

    const shown = result.ordinals || result.payment;
    showMessage('Bitcoin / Ordinals wallet connected: ' + shortAddress(shown));
    return result;
  }

  function renderBitcoinAddress(result) {
    const box = $('btcWalletValue');
    if (!box) return;
    const strong = box.querySelector('strong');
    if (!strong) return;
    const main = result.ordinals || result.payment;
    const extra = result.ordinals && result.payment && result.ordinals !== result.payment
      ? ' · payment ' + shortAddress(result.payment)
      : '';
    strong.textContent = shortAddress(main) + ' · ' + (result.walletName || 'Bitcoin Wallet') + extra;
    strong.title = [
      result.ordinals ? 'Ordinals: ' + result.ordinals : '',
      result.payment ? 'Payment: ' + result.payment : ''
    ].filter(Boolean).join('\n');
  }

  function restoreSavedWallets() {
    window.scpmAuth && window.scpmAuth.session().then(async session => {
      const user = session && session.user;
      if (!user) return;

      try {
        const { data: profile, error } = await window.scpmSupabase
          .from('profiles')
          .select('wallet_address,wallet_verified_at')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        const address = profile && profile.wallet_address;
        const verified = !!(profile && profile.wallet_verified_at && address);
        const eth = JSON.parse(localStorage.getItem('scpm_eth_wallet_' + user.id) || 'null');
        const walletName = eth && eth.address &&
          String(eth.address).toLowerCase() === String(address || '').toLowerCase()
          ? (eth.walletName || 'Ethereum Wallet')
          : 'Ethereum Wallet';

        const btn = $('walletBtn');
        const unlinkBtn = $('unlinkWalletBtn');

        if (address) {
          const status = verified ? 'Ownership verified' : 'Ownership not verified';
          const value = shortAddress(address) + ' · ' + walletName + ' · ' + status;
          if ($('walletValue')) $('walletValue').textContent = value;
          
          if (btn) btn.textContent = 'Сменить Ethereum кошелек';
          if (unlinkBtn) unlinkBtn.style.display = 'block';
        } else {
          if ($('walletValue')) $('walletValue').textContent = 'Not connected';
          if (btn) btn.textContent = 'Connect Ethereum wallet';
          if (unlinkBtn) unlinkBtn.style.display = 'none';
        }
      } catch (e) {
        console.warn('[SCPM Wallet] Could not restore Ethereum verification status from profile:', e);
      }

      try {
        const btc = JSON.parse(localStorage.getItem('scpm_btc_wallet_' + user.id) || 'null');
        if (btc && (btc.ordinals || btc.payment)) renderBitcoinAddress(btc);
      } catch (_) {}
    }).catch(() => {});
  }

  window.scpmWallet = {
    connect: connectEthereum,
    connectEthereum,
    connectBitcoin,
    discoverEthereumProviders,
    detectBitcoinProviders: collectBitcoinProviders,
    getState: () => ({
      ethProviders: state.ethProviders.map(p => p.info || {}),
      btcProviders: state.btcProviders.map(p => p.name)
    })
  };

  document.addEventListener('DOMContentLoaded', ensureWalletUI);
})();