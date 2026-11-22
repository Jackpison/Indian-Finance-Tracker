/* Apply the saved theme before first paint to avoid a flash. */
try{var m=localStorage.getItem('pocketbook.theme');if(m&&m!=='system')document.documentElement.setAttribute('data-theme',m)}catch(e){}
