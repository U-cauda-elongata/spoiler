const user = {
	name: 'オナガグマ',
	screenname: 'U_caudaElongata',
	profile_image: 'https://pbs.twimg.com/profile_images/1242864145935945728/nRlrQx_-_normal.jpg',
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

	const hash = location.hash;
	if (!hash) {
		throw '本文が指定されていません。';
	}

	const pubKey = document.getElementsByClassName('public-key')[0].innerHTML;
	const publicKeys = (await openpgp.key.readArmored(pubKey)).keys;

	const cleartext = decodeURIComponent(hash.slice(1));
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

	const armorRe = /^(?:.*\n)?(-----BEGIN PGP SIGNED MESSAGE-----\s*\n(?:Hash:\s+[^\n]*\n)?(?:\s*\n)*)\n[^]*\n(-----BEGIN PGP SIGNATURE-----\s*\n[^]*-----END PGP SIGNATURE-----\s*)(\n.*)?$/;
	const [, head, signature] = cleartext.match(armorRe);

	const [heading, trailing] = message.text.split(/\r?\n\r?\n/, 2);
	const headingMasked = heading.replace(/(?<=\[[^\]]*)[^\]]/g, '○').replaceAll(/\[|]/g, '');
	const headingHTML = heading.replaceAll(/\[([^\]]*)(]|$)/g, (_, s, closing) => {
		if (closing) {
			s += '<span class="bracket">]</span>';
		}
		return `<span class="mask"><span class="bracket">[</span>${s}</span>`;
	});
	const text = trailing ? `${headingHTML}\n<hr />${trailing}` : `<p>${heading}</p>`;

	function dateToString(d) {
		function pad(n) {
			return String(n).padStart(2, '0');
		}
		return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	}

	document.title += `: "${headingMasked}"`;

	document.getElementsByClassName('author-link')[0].href = `https://twitter.com/${user.screenname}`;
	document.getElementsByClassName('profile-image')[0].src = user.profile_image;
	document.getElementsByClassName('name')[0].innerText = user.name;
	document.getElementsByClassName('screenname-text')[0].innerHTML = user.screenname;
	document.getElementsByClassName('search-link')[0].href = `https://twitter.com/hashtag/spoiler+from:${user.screenname}?f=live`;
	const timestamp = document.getElementsByClassName('timestamp')[0];
	timestamp.innerHTML = dateToString(created);
	timestamp.setAttribute('datetime', created.toISOString());
	document.getElementsByClassName('armor-head')[0].innerHTML = head;
	document.getElementsByClassName('armor-text')[0].innerHTML = text;
	document.getElementsByClassName('armor-signature')[0].innerHTML = signature;
})()
	.catch(e => {
		const main = document.querySelector('main > article');
		const errorBox = document.getElementsByClassName('error')[0];
		const p = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
		p.innerText = e;
		errorBox.appendChild(p);
		main.classList.add('cloak');
		errorBox.classList.remove('cloak');
		if (typeof(e) != 'string') {
			throw e;
		}
	})
	.finally(() => Array.prototype.forEach.apply(document.querySelectorAll('[aria-busy]'), [elt => {
		elt.removeAttribute('aria-busy');
	}]));
