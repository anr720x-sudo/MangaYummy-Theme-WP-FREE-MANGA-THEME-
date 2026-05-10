const ajax = mangayummy.ajaxurl;
const site = mangayummy.siteurl;

function searchUsers(q){
    fetch(ajax + '?action=mangayummy_search_users&q=' + encodeURIComponent(q))
    .then(r => r.json())
    .then(users => {
        if (users.length > 0) {
        }
        showUsers(users);
    });
}

function openUser(id){
    window.location.href = site + '/users/' + id + '/';
}

// ===== GENURI - LISTA COMPLETA =====
function loadAllGenres() {
    const container = document.getElementById('genres-filter') || document.getElementById('genres-list');
    if (!container) {
        return;
    }
    
    fetch(ajax + '?action=mangayummy_get_all_genres')
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // WordPress wp_send_json_success wraps data in .data
            const genres = data.data.genres || data.genres;
            displayGenres(genres, container);
        }
    });
}

function displayGenres(genres, container) {
    container.innerHTML = '';
    const currentGenre = window.currentGenre || '';
    const currentSort = window.currentSort || 'relevanta';
    
    genres.forEach(genre => {
        const genreItem = document.createElement('div');
        genreItem.className = 'genre-item';
        
        // Determine if this genre is active
        const isActive = currentGenre === genre.slug;
        
        const link = document.createElement('a');
        link.href = `${site}browse/?genre=${genre.slug}&sort=${currentSort}`;
        link.className = `genre-link ${isActive ? 'active' : ''}`;
        link.innerHTML = `
            ${genre.name}
            <span class="genre-count">(${genre.count})</span>
        `;
        
        genreItem.appendChild(link);
        container.appendChild(genreItem);
    });
}

// Load genres on load
document.addEventListener('DOMContentLoaded', function() {
    loadAllGenres();
    loadAllAuthors();
    loadAllArtists();
});

// ===== AUTORI - LISTA COMPLETA =====
function loadAllAuthors() {
    const container = document.getElementById('authors-filter') || document.getElementById('authors-list');
    if (!container) {
        return;
    }
    
    fetch(ajax + '?action=mangayummy_get_all_authors')
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const authors = data.data.authors || data.authors;
            displayAuthors(authors, container);
        }
    });
}

function displayAuthors(authors, container) {
    container.innerHTML = '';
    const currentAuthor = window.currentAuthor || '';
    const currentSort = window.currentSort || 'relevanta';
    
    authors.forEach(author => {
        const authorItem = document.createElement('div');
        authorItem.className = 'author-item';
        
        const isActive = currentAuthor === author.slug;
        
        const link = document.createElement('a');
        link.href = `${site}browse/?author=${author.slug}&sort=${currentSort}`;
        link.className = `author-link ${isActive ? 'active' : ''}`;
        link.innerHTML = `
            ${author.name}
            <span class="author-count">(${author.count})</span>
        `;
        
        authorItem.appendChild(link);
        container.appendChild(authorItem);
    });
}

// ===== ARTISTS - COMPLETE LIST =====
function loadAllArtists() {
    const container = document.getElementById('artists-filter') || document.getElementById('artists-list');
    if (!container) {
        return;
    }
    
    fetch(ajax + '?action=mangayummy_get_all_artists')
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const artists = data.data.artists || data.artists;
            displayArtists(artists, container);
        }
    });
}

function displayArtists(artists, container) {
    container.innerHTML = '';
    const currentArtist = window.currentArtist || '';
    const currentSort = window.currentSort || 'relevanta';
    
    artists.forEach(artist => {
        const artistItem = document.createElement('div');
        artistItem.className = 'artist-item';
        
        const isActive = currentArtist === artist.slug;
        
        const link = document.createElement('a');
        link.href = `${site}browse/?artist=${artist.slug}&sort=${currentSort}`;
        link.className = `artist-link ${isActive ? 'active' : ''}`;
        link.innerHTML = `
            ${artist.name}
            <span class="artist-count">(${artist.count})</span>
        `;
        
        artistItem.appendChild(link);
        container.appendChild(artistItem);
    });
}