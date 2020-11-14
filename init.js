const user = {
	name: 'オナガグマ',
	screenname: 'U_caudaElongata',
	profile_image: 'https://s3.amazonaws.com/keybase_processed_uploads/46700a68eaffa176d87f386d66eb2405_360_360.jpg',
};

(async () => {
	'use strict';

	Array.prototype.forEach.apply(document.querySelectorAll('[data-copy]'), [elt => {
		const target = elt.dataset.copy;
		elt.addEventListener('click', () => {
			const text = document.getElementsByClassName(target)[0].innerText;
			navigator.clipboard.writeText(text);
		});
	}]);

	let cleartext;
	document.getElementsByClassName('armor-copy-button')[0].addEventListener('click', () => {
		if (cleartext) {
			navigator.clipboard.writeText(cleartext);
		}
	});

	const originalTitle = document.title;

	const authorLink = document.getElementsByClassName('author-link')[0];
	const profileImage = document.getElementsByClassName('profile-image')[0];
	const name = document.getElementsByClassName('name')[0];
	const screennameText = document.getElementsByClassName('screenname-text')[0];
	const searchLink = document.getElementsByClassName('search-link')[0];
	const timestamp = document.getElementsByClassName('timestamp')[0];
	const armorHead = document.getElementsByClassName('armor-head')[0];
	const armorText = document.getElementsByClassName('armor-text')[0];
	const armorSignature = document.getElementsByClassName('armor-signature')[0];

	const main = document.querySelector('main > article');
	const errorContainer = document.getElementsByClassName('error-container')[0];
	const errorMessage = document.getElementsByClassName('error')[0];

	function reset() {
		Array.prototype.forEach.apply(document.querySelectorAll('[aria-busy]'), [elt => {
			elt.setAttribute('aria-busy', true);
		}]);
		name.innerHTML
			= screennameText.innerHTML
			= timestamp.innerHTML
			= armorHead.innerHTML
			= armorText.innerHTML
			= armorSignature.innerHTML
			= '';
		profileImage.src = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20style=%22background-color:%23AAA%22%3E%3C/svg%3E';
		document.title = originalTitle;
		authorLink.removeAttribute('href');
		searchLink.removeAttribute('href');
		timestamp.removeAttribute('datetime');
		errorContainer.toggleAttribute('hidden', true);
		main.toggleAttribute('hidden', false);
	}

	// Manually compile the `RegExp` in advance, since lookbehind match is not available
	// in some UAs (e.g., Safari, at the time of writing).
	let reMask;
	try {
		reMask = new RegExp('(?<=\\[[^\\]]*)[^\\]]', 'g');
	} catch {
		// noop
	}

	const pubKey = document.getElementsByClassName('public-key')[0].innerHTML;
	const publicKeys = (await openpgp.key.readArmored(pubKey)).keys;

	async function initInner() {
		const hash = location.hash;
		if (!hash) {
			throw '本文が指定されていません。';
		}

		cleartext = decodeURIComponent(hash.slice(1));
		const armorRe = /^(?:.*\n)?(-----BEGIN PGP SIGNED MESSAGE-----\s*\n(?:Hash:\s+[^\n]*\n)?(?:\s*\n)*)\n[^]*\n(-----BEGIN PGP SIGNATURE-----\s*\n[^]*-----END PGP SIGNATURE-----\s*)(\n.*)?$/;
		const [, head, signature] = cleartext.match(armorRe);

		const message = await openpgp.cleartext.readArmored(cleartext);
		let created;
		let verified;
		try {
			created = message.signature.packets[0].created;
			const results = (await message.verify(publicKeys)).map(({ verified }) => verified);
			verified = (await Promise.all(results)).every(x => x);
		} catch (e) {
			console.log(e);
			verified = false;
		}
		if (!verified) {
			throw '署名が不正です。';
		}

		const parts = message.text.split(/\r?\n\r?\n/);
		const heading = parts[0];
		const trailing = parts.slice(1).join("\n\n");
		const headingHTML = heading.replaceAll(/\[([^\]]*)(]|$)/g, (_, s, closing) => {
			if (closing) {
				s += '<span class="bracket">]</span>';
			}
			return `<span class="mask"><span class="bracket">[</span>${s}</span>`;
		});
		const text = trailing ? `${headingHTML}\n<hr />${trailing}` : `${headingHTML}`;

		function dateToString(d) {
			function pad(n) {
				return String(n).padStart(2, '0');
			}
			return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		}

		if (reMask) {
			const headingMasked = heading.replace(reMask, '○').replaceAll(/\[|]/g, '');
			document.title += `: "${headingMasked}"`;
		}

		authorLink.href = `https://twitter.com/${user.screenname}`;
		profileImage.src = user.profile_image;
		name.innerText = user.name;
		screennameText.innerHTML = user.screenname;
		searchLink.href = `https://twitter.com/hashtag/spoiler+from:${user.screenname}?f=live`;

		const time = document.createElement('time');
		time.innerHTML = dateToString(created);
		time.setAttribute('datetime', created.toISOString());
		timestamp.appendChild(time);

		armorHead.innerHTML = head;
		armorText.innerHTML = text;
		armorSignature.innerHTML = signature;
	}

	function init() {
		return initInner()
			.catch(e => {
				cleartext = null;
				errorMessage.innerText = e;
				main.toggleAttribute('hidden', true);
				errorContainer.toggleAttribute('hidden', false);
				if (typeof(e) != 'string') {
					throw e;
				}
			})
			.finally(() => Array.prototype.forEach.apply(document.querySelectorAll('[aria-busy]'), [elt => {
				elt.setAttribute('aria-busy', false);
			}]));
	}

	window.addEventListener('popstate', () => {
		reset();
		init();
	});

	await init();
})();
