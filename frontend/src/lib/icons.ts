/** Ported 1:1 from quay-ux-mockup_v02.html's ICONS map. */
export const ICONS: Record<string, string> = {
	star: '<polygon points="12 2 14.9 8.6 22 9.3 16.6 14.1 18.2 21 12 17.3 5.8 21 7.4 14.1 2 9.3 9.1 8.6"></polygon>',
	search: '<circle cx="11" cy="11" r="6"></circle><line x1="20" y1="20" x2="15.5" y2="15.5"></line>',
	bell: '<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5 -.5 2 -2 2 -6Z"></path><path d="M10 19a2 2 0 0 0 4 0"></path>',
	branch:
		'<circle cx="7" cy="6" r="2"></circle><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="10" r="2"></circle><line x1="7" y1="8" x2="7" y2="16"></line><path d="M7 13 C7 10 10 10 12 10 C15 10 16 10 18 10"></path>',
	pr: '<circle cx="6" cy="6" r="2"></circle><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle><line x1="6" y1="8" x2="6" y2="16"></line><path d="M18 16 C18 10 12 10 12 10"></path>',
	issue:
		'<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="13"></line><circle cx="12" cy="16.3" r=".9" fill="currentColor" stroke="none"></circle>',
	check: '<polyline points="5 13 10 18 19 7"></polyline>',
	refresh:
		'<path d="M4 12a8 8 0 0 1 14.5 -4.5"></path><polyline points="18 3 18.5 7.5 14 7"></polyline><path d="M20 12a8 8 0 0 1 -14.5 4.5"></path><polyline points="6 21 5.5 16.5 10 17"></polyline>',
	up: '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline>',
	down: '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="6 13 12 19 18 13"></polyline>',
	commit: '<line x1="12" y1="3" x2="12" y2="8"></line><circle cx="12" cy="12" r="3.4"></circle><line x1="12" y1="16" x2="12" y2="21"></line>',
	ext: '<path d="M14 4h6v6"></path><line x1="20" y1="4" x2="10" y2="14"></line><path d="M18 13v6a1 1 0 0 1 -1 1H5a1 1 0 0 1 -1 -1V7a1 1 0 0 1 1 -1h6"></path>',
	terminal: '<polyline points="4 6 10 12 4 18"></polyline><line x1="12" y1="18" x2="20" y2="18"></line>',
	trash:
		'<path d="M4 7h16"></path><path d="M9 7V5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2"></path><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2 -2l1 -13"></path>',
	play: '<polygon points="8 5 19 12 8 19"></polygon>',
	tag: '<path d="M3 11.5V5a2 2 0 0 1 2 -2h6.5L20 11.5 12.5 19 3 11.5Z"></path><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"></circle>',
	copy: '<rect x="9" y="9" width="11" height="11" rx="1.5"></rect><rect x="4" y="4" width="11" height="11" rx="1.5"></rect>',
	chevronRight: '<polyline points="9 6 15 12 9 18"></polyline>',
	chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
	x: '<line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line>',
	plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
	folder: '<path d="M4 6a1 1 0 0 1 1 -1h4.5l2 2H19a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1H5a1 1 0 0 1 -1 -1Z"></path>',
	bolt: '<polygon points="12 2 4 14 11 14 10 22 20 9 13 9 12 2"></polygon>',
	clock: '<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15.5 14"></polyline>',
	cmdline: '<line x1="4" y1="12" x2="20" y2="12"></line><polyline points="4 6 8 6"></polyline><polyline points="16 18 20 18"></polyline>',
	refreshRepo: '<circle cx="12" cy="12" r="9"></circle><path d="M9 12h6M12 9v6"></path>',
	settings2:
		'<line x1="4" y1="6" x2="20" y2="6"></line><circle cx="14" cy="6" r="2"></circle><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="8" cy="12" r="2"></circle><line x1="4" y1="18" x2="20" y2="18"></line><circle cx="16" cy="18" r="2"></circle>'
};

export type IconName = keyof typeof ICONS;
