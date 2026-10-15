import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Standard Breeze CSRF handling: read token from meta tag set in the root blade
// and apply it to every axios/XHR request so Inertia/Laravel forms pass VerifyCsrfToken.
const csrf = document.head.querySelector('meta[name="csrf-token"]');
if (csrf) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = csrf.content;
}
