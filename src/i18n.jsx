import { createContext, useContext, useState } from 'react'

// Rječnik prijevoda. Svaki ključ ima englesku (en) i hrvatsku (hr) inačicu.
// Dinamične vrijednosti ubacujemo preko {ime} (npr. t('daily_sub', { n: 5 })).
const PRIJEVODI = {
  en: {
    // Zajedničko
    back: '← Back',
    home: '🏠 Home',
    logout: 'Log out',
    loading: 'Loading...',
    save: 'Save',
    moment: 'One moment...',

    // Varijante (vrste igre)
    var_klasik_ime: 'Classic',
    var_klasik_opis: 'One word',
    var_dvojac_ime: 'Duo',
    var_dvojac_opis: 'Two words at once',
    var_cetvorka_ime: 'Quad',
    var_cetvorka_opis: 'Four words at once',
    var_osmorka_ime: 'Octo',
    var_osmorka_opis: 'Eight words at once',

    // Modovi
    nacin_daily_ime: 'Daily',
    nacin_daily_opis: 'One word a day',
    nacin_weekly_ime: 'Weekly',
    nacin_weekly_opis: 'Same word all week',
    nacin_monthly_ime: 'Monthly',
    nacin_monthly_opis: 'Same word all month',
    nacin_unlimited_ime: 'Unlimited',
    nacin_unlimited_opis: 'Play endlessly',
    nacin_timer_ime: 'Timer',
    nacin_timer_opis: 'Solve as many as you can before time runs out',
    timer_sub: '⏱️ Timer',
    timer_time: 'Time',
    timer_score: 'Score',
    timer_best: 'Best',
    timer_over: "Time's up!",
    play_again: 'Play again',

    // Hubovi
    choose_variant: 'Choose game type',
    choose_mode: 'Choose game mode',
    friends: '👥 Friends',
    leaderboard: '🏆 Leaderboard',
    settings: '⚙️ Settings',

    // Igra
    modes_title: 'Modes',
    stat_played: 'Played',
    stat_wins: 'Wins',
    stat_streak: 'Streak 🔥',
    stat_record: 'Record',
    win_msg: 'Well done! You solved it! 🎉',
    lose_msg: 'Game over. Words: {rijeci}',
    too_few: 'Not enough letters',
    not_in_list: 'Not in word list',
    new_game: 'New game',
    share: '📋 Share',
    share_copied: 'Copied! ✅',
    next_word_in: 'Next word in',
    mobile_hint: 'Tap the board for the phone keyboard ⌨️',
    word_length: 'Word length',
    words_lang: 'Word language',
    level: 'Level',
    level_short: 'Lvl',
    progress_title: '🏅 Progress',
    achievements: 'Achievements',
    post_prva_pobjeda: 'First win',
    post_deset_pobjeda: '10 wins',
    post_pedeset_pobjeda: '50 wins',
    post_niz_pet: 'Streak of 5',
    post_niz_deset: 'Streak of 10',
    post_brzi: 'Solved in ≤2',
    post_sve_varijante: 'Played all types',
    post_stotka: '100 games',
    how_to_play: 'How to play',
    rules_goal_1: 'Guess the hidden word in {redova} tries.',
    rules_goal_n: 'Solve {rijeci} words at the same time — every guess is checked against all boards. You have {redova} tries.',
    rules_colors: 'After each guess, tiles change color:',
    rules_green: 'Right letter, right spot',
    rules_yellow: 'Right letter, wrong spot',
    rules_gray: 'Letter not in the word',
    rules_modes_title: 'Modes',
    rules_modes: 'Daily / weekly / monthly give everyone the same word for that period; unlimited plays forever.',
    rules_extra: 'Pick the word language any time, and the word length in unlimited (4–8).',
    daily_sub: 'Daily challenge #{n}',
    weekly_sub: 'Weekly challenge #{n}',
    monthly_sub: 'Monthly challenge',
    unlimited_sub: 'Unlimited ♾️',

    // Ljestvica
    lb_title: '🏆 Leaderboard',
    lb_global: '🌍 Global',
    lb_friends: '👥 Friends',
    lb_empty_global: 'No players on this leaderboard yet.',
    lb_empty_friends: 'No friends have a win here yet.',
    lb_player: 'Player',
    lb_wins: 'Wins',
    lb_streak: 'Streak 🔥',

    // Statistika
    stats_title: '📊 Statistics',
    stats_played: 'Played',
    stats_winpct: 'Win %',
    stats_wins: 'Wins',
    stats_losses: 'Losses',
    stats_record: 'Record 🔥',
    stats_avg: 'Average',
    stats_distribution: 'Guess distribution',
    stats_by_variant: 'By variant',

    // Postavke
    set_title: '⚙️ Settings',
    set_logged_as: 'Logged in as',
    set_change_pic: 'Change picture',
    set_detailed_stats: '📊 Detailed statistics',
    set_language: 'Language',
    set_theme: 'Theme',
    set_color: 'Color',
    set_change_username: 'Change username',
    set_new_username: 'New username',
    set_change_password: 'Change password',
    set_new_password: 'New password',
    set_made_with: 'Wordle • made with React',
    set_pick_image: '❌ Pick an image',
    set_image_too_big: '❌ Image too big (max 2MB)',
    set_image_updated: '✅ Picture updated',
    set_name_min: '❌ Name must be at least 3 characters',
    set_name_taken: '❌ That name is taken',
    set_username_changed: '✅ Username changed',
    set_pass_min: '❌ Password must be at least 6 characters',
    set_pass_changed: '✅ Password changed',

    // Prijatelji
    fr_title: '👥 Friends',
    fr_search: 'Search users by name...',
    fr_add: 'Add',
    fr_requests: 'Requests',
    fr_accept: 'Accept',
    fr_decline: 'Decline',
    fr_my_friends: 'My friends ({n})',
    fr_none: 'No friends yet.',
    fr_remove: 'Remove',
    fr_sent: 'Sent (waiting)',
    fr_pending: 'pending',
    fr_request_sent: 'Request sent! ✅',
    fr_request_exists: 'Request already exists.',

    // Prijava
    login_subtitle: 'Log in',
    register_subtitle: 'Create a new account',
    login_username: 'Username',
    login_password: 'Password',
    login_submit: 'Log in',
    register_submit: 'Sign up',
    login_switch_to_login: 'Already have an account? Log in',
    login_switch_to_register: "Don't have an account? Sign up",
    login_err_name_min: 'Username must be at least 3 characters',
    login_err_pass_min: 'Password must be at least 6 characters',
    login_err_taken: 'That username is taken',
    login_err_credentials: 'Wrong username or password',
    register_warning: '⚠️ Remember your password well — there is no email recovery.',

    // Teme
    tema_tamna_ime: 'Classic dark',
    tema_svijetla_ime: 'Classic light',
    tema_ocean_ime: 'Ocean',
    tema_suma_ime: 'Forest',
    tema_zalazak_ime: 'Sunset',
    tema_ljubicasta_ime: 'Purple night',
    tema_sepija_ime: 'Sepia',
    tema_tresnja_ime: 'Cherry',
    tema_menta_ime: 'Mint',

    // Izazovi
    challenges: '⚔️ Challenges',
    ch_title: '⚔️ Challenges',
    ch_new: 'New challenge',
    ch_pick_friend: 'Pick a friend',
    ch_criterion: 'Win by',
    ch_crit_attempts: 'Fewest attempts',
    ch_crit_time: 'Fastest time',
    ch_word_count: 'Number of words',
    ch_words_label: '{n} words',
    ch_custom: 'Custom',
    ch_type: 'Type',
    ch_offline: '📴 Offline',
    ch_online: '🟢 Online',
    ch_requests: 'Requests',
    ch_accept: 'Accept',
    ch_decline: 'Decline',
    ch_awaiting_accept: 'Waiting for acceptance',
    ch_grace_left: 'Time to finish',
    ch_lost_first: 'Opponent finished first — you lost',
    ch_time_up: "Time's up — you lost",
    ch_you_first: 'You finished first! Opponent still has time.',
    ch_send: 'Send challenge',
    ch_sent: 'Challenge sent! ⚔️',
    ch_no_friends: 'Add a friend first to challenge them.',
    ch_to_play: 'To play',
    ch_waiting: 'Waiting for opponent',
    ch_finished: 'Finished',
    ch_play: 'Play',
    ch_none: 'No challenges yet.',
    ch_you_win: 'You won! 🏆',
    ch_you_lose: 'You lost',
    ch_draw: 'Draw 🤝',
    ch_attempts_short: 'att.',
    ch_time_short: 'time',
    ch_word_of: 'Word {n} / {total}',
    ch_total_attempts: 'Total attempts',
    ch_total_time: 'Total time',
    ch_complete: 'Challenge complete!',
    ch_waiting_result: 'Waiting for opponent to finish...',
    ch_you: 'You',
    ch_opponent: 'Opponent',
    ch_word_was: 'Word: {rijec}',
    ch_turns: '🔄 Turn-based',
    pt_your_turn: '✍️ Your turn',
    pt_opp_turn: "⏳ Opponent's turn",
    pt_solved_waiting: '✅ Solved! Waiting...',
    pt_you: 'You',
    pt_opponent: 'Opponent',
    pt_idle: "Opponent hasn't played in a while.",
    pt_claim: '🏆 Claim win',
  },

  hr: {
    // Zajedničko
    back: '← Natrag',
    home: '🏠 Početna',
    logout: 'Odjava',
    loading: 'Učitavam...',
    save: 'Spremi',
    moment: 'Trenutak...',

    // Varijante
    var_klasik_ime: 'Klasik',
    var_klasik_opis: 'Jedna riječ',
    var_dvojac_ime: 'Dvojac',
    var_dvojac_opis: 'Dvije riječi odjednom',
    var_cetvorka_ime: 'Četvorka',
    var_cetvorka_opis: 'Četiri riječi odjednom',
    var_osmorka_ime: 'Osmorka',
    var_osmorka_opis: 'Osam riječi odjednom',

    // Modovi
    nacin_daily_ime: 'Dnevni',
    nacin_daily_opis: 'Jedna riječ dnevno',
    nacin_weekly_ime: 'Tjedni',
    nacin_weekly_opis: 'Ista riječ cijeli tjedan',
    nacin_monthly_ime: 'Mjesečni',
    nacin_monthly_opis: 'Ista riječ cijeli mjesec',
    nacin_unlimited_ime: 'Neograničeno',
    nacin_unlimited_opis: 'Igraj bez kraja',
    nacin_timer_ime: 'Timer',
    nacin_timer_opis: 'Riješi što više prije isteka vremena',
    timer_sub: '⏱️ Timer',
    timer_time: 'Vrijeme',
    timer_score: 'Bodovi',
    timer_best: 'Rekord',
    timer_over: 'Isteklo vrijeme!',
    play_again: 'Igraj ponovno',

    // Hubovi
    choose_variant: 'Odaberi vrstu igre',
    choose_mode: 'Odaberi način igre',
    friends: '👥 Prijatelji',
    leaderboard: '🏆 Ljestvica',
    settings: '⚙️ Postavke',

    // Igra
    modes_title: 'Modovi',
    stat_played: 'Odigrano',
    stat_wins: 'Pobjede',
    stat_streak: 'Niz 🔥',
    stat_record: 'Rekord',
    win_msg: 'Bravo! Riješio si sve! 🎉',
    lose_msg: 'Kraj igre. Riječi: {rijeci}',
    too_few: 'Premalo slova',
    not_in_list: 'Nije u popisu riječi',
    new_game: 'Nova igra',
    share: '📋 Podijeli',
    share_copied: 'Kopirano! ✅',
    next_word_in: 'Sljedeća riječ za',
    mobile_hint: 'Dodirni ploču za tipkovnicu telefona ⌨️',
    word_length: 'Duljina riječi',
    words_lang: 'Jezik riječi',
    level: 'Razina',
    level_short: 'Lvl',
    progress_title: '🏅 Napredak',
    achievements: 'Postignuća',
    post_prva_pobjeda: 'Prva pobjeda',
    post_deset_pobjeda: '10 pobjeda',
    post_pedeset_pobjeda: '50 pobjeda',
    post_niz_pet: 'Niz od 5',
    post_niz_deset: 'Niz od 10',
    post_brzi: 'Pogodak u ≤2',
    post_sve_varijante: 'Sve varijante',
    post_stotka: '100 igara',
    how_to_play: 'Kako se igra',
    rules_goal_1: 'Pogodi skrivenu riječ u {redova} pokušaja.',
    rules_goal_n: 'Riješi {rijeci} riječi istovremeno — svaki pokušaj provjerava se na svim pločama. Imaš {redova} pokušaja.',
    rules_colors: 'Nakon svakog pokušaja pločice mijenjaju boju:',
    rules_green: 'Točno slovo, točno mjesto',
    rules_yellow: 'Točno slovo, krivo mjesto',
    rules_gray: 'Slova nema u riječi',
    rules_modes_title: 'Modovi',
    rules_modes: 'Dnevni / tjedni / mjesečni daju svima istu riječ za to razdoblje; neograničeni se igra bez kraja.',
    rules_extra: 'Jezik riječi možeš birati uvijek, a duljinu riječi u neograničenom (4–8).',
    daily_sub: 'Dnevni izazov #{n}',
    weekly_sub: 'Tjedni izazov #{n}',
    monthly_sub: 'Mjesečni izazov',
    unlimited_sub: 'Neograničeno ♾️',

    // Ljestvica
    lb_title: '🏆 Ljestvica',
    lb_global: '🌍 Globalno',
    lb_friends: '👥 Prijatelji',
    lb_empty_global: 'Još nema igrača na ovoj ljestvici.',
    lb_empty_friends: 'Nitko od prijatelja još nema pobjedu ovdje.',
    lb_player: 'Igrač',
    lb_wins: 'Pobjede',
    lb_streak: 'Niz 🔥',

    // Statistika
    stats_title: '📊 Statistika',
    stats_played: 'Odigrano',
    stats_winpct: 'Pobjede',
    stats_wins: 'Pobjeda',
    stats_losses: 'Poraza',
    stats_record: 'Rekord 🔥',
    stats_avg: 'Prosjek',
    stats_distribution: 'Raspodjela pogodaka',
    stats_by_variant: 'Po varijantama',

    // Postavke
    set_title: '⚙️ Postavke',
    set_logged_as: 'Prijavljen kao',
    set_change_pic: 'Promijeni sliku',
    set_detailed_stats: '📊 Detaljna statistika',
    set_language: 'Jezik',
    set_theme: 'Tema',
    set_color: 'Boja',
    set_change_username: 'Promijeni korisničko ime',
    set_new_username: 'Novo korisničko ime',
    set_change_password: 'Promijeni lozinku',
    set_new_password: 'Nova lozinka',
    set_made_with: 'Wordle • napravljeno s Reactom',
    set_pick_image: '❌ Odaberi sliku',
    set_image_too_big: '❌ Slika je prevelika (max 2MB)',
    set_image_updated: '✅ Slika ažurirana',
    set_name_min: '❌ Ime mora imati barem 3 znaka',
    set_name_taken: '❌ To ime je zauzeto',
    set_username_changed: '✅ Korisničko ime promijenjeno',
    set_pass_min: '❌ Lozinka mora imati barem 6 znakova',
    set_pass_changed: '✅ Lozinka promijenjena',

    // Prijatelji
    fr_title: '👥 Prijatelji',
    fr_search: 'Traži korisnika po imenu...',
    fr_add: 'Dodaj',
    fr_requests: 'Zahtjevi',
    fr_accept: 'Prihvati',
    fr_decline: 'Odbij',
    fr_my_friends: 'Moji prijatelji ({n})',
    fr_none: 'Još nemaš prijatelja.',
    fr_remove: 'Ukloni',
    fr_sent: 'Poslano (čeka odgovor)',
    fr_pending: 'na čekanju',
    fr_request_sent: 'Zahtjev poslan! ✅',
    fr_request_exists: 'Zahtjev već postoji.',

    // Prijava
    login_subtitle: 'Prijavi se',
    register_subtitle: 'Napravi novi račun',
    login_username: 'Korisničko ime',
    login_password: 'Lozinka',
    login_submit: 'Prijavi se',
    register_submit: 'Registriraj se',
    login_switch_to_login: 'Već imaš račun? Prijavi se',
    login_switch_to_register: 'Nemaš račun? Registriraj se',
    login_err_name_min: 'Korisničko ime mora imati barem 3 znaka',
    login_err_pass_min: 'Lozinka mora imati barem 6 znakova',
    login_err_taken: 'To korisničko ime je zauzeto',
    login_err_credentials: 'Pogrešno korisničko ime ili lozinka',
    register_warning: '⚠️ Dobro zapamti lozinku — nema oporavka putem emaila.',

    // Teme
    tema_tamna_ime: 'Klasična tamna',
    tema_svijetla_ime: 'Klasična svijetla',
    tema_ocean_ime: 'Ocean',
    tema_suma_ime: 'Šuma',
    tema_zalazak_ime: 'Zalazak',
    tema_ljubicasta_ime: 'Ljubičasta noć',
    tema_sepija_ime: 'Sepija',
    tema_tresnja_ime: 'Trešnja',
    tema_menta_ime: 'Menta',

    // Izazovi
    challenges: '⚔️ Izazovi',
    ch_title: '⚔️ Izazovi',
    ch_new: 'Novi izazov',
    ch_pick_friend: 'Odaberi prijatelja',
    ch_criterion: 'Pobjeđuje',
    ch_crit_attempts: 'Manje pokušaja',
    ch_crit_time: 'Kraće vrijeme',
    ch_word_count: 'Broj riječi',
    ch_words_label: '{n} riječi',
    ch_custom: 'Vlastito',
    ch_type: 'Vrsta',
    ch_offline: '📴 Offline',
    ch_online: '🟢 Online',
    ch_requests: 'Zahtjevi',
    ch_accept: 'Prihvati',
    ch_decline: 'Odbij',
    ch_awaiting_accept: 'Čeka prihvaćanje',
    ch_grace_left: 'Vrijeme za završiti',
    ch_lost_first: 'Protivnik je prvi završio — izgubio si',
    ch_time_up: 'Isteklo je vrijeme — izgubio si',
    ch_you_first: 'Prvi si završio! Protivnik još ima vremena.',
    ch_send: 'Pošalji izazov',
    ch_sent: 'Izazov poslan! ⚔️',
    ch_no_friends: 'Prvo dodaj prijatelja da ga možeš izazvati.',
    ch_to_play: 'Za odigrati',
    ch_waiting: 'Čeka protivnika',
    ch_finished: 'Završeni',
    ch_play: 'Igraj',
    ch_none: 'Još nema izazova.',
    ch_you_win: 'Pobijedio si! 🏆',
    ch_you_lose: 'Izgubio si',
    ch_draw: 'Neriješeno 🤝',
    ch_attempts_short: 'pok.',
    ch_time_short: 'vrijeme',
    ch_word_of: 'Riječ {n} / {total}',
    ch_total_attempts: 'Ukupno pokušaja',
    ch_total_time: 'Ukupno vrijeme',
    ch_complete: 'Izazov gotov!',
    ch_waiting_result: 'Čekamo da protivnik završi...',
    ch_you: 'Ti',
    ch_opponent: 'Protivnik',
    ch_word_was: 'Riječ: {rijec}',
    ch_turns: '🔄 Na poteze',
    pt_your_turn: '✍️ Tvoj red',
    pt_opp_turn: '⏳ Protivnikov red',
    pt_solved_waiting: '✅ Riješeno! Čekaš...',
    pt_you: 'Ti',
    pt_opponent: 'Protivnik',
    pt_idle: 'Protivnik već neko vrijeme ne igra.',
    pt_claim: '🏆 Preuzmi pobjedu',
  },
}

export const JEZICI = [
  { id: 'en', ime: 'English' },
  { id: 'hr', ime: 'Hrvatski' },
]

const KLJUC_JEZIKA = 'wordle-jezik'

// Učitaj spremljeni jezik; ako ga nema -> ENGLESKI (zadani).
export function ucitajJezik() {
  const spremljen = localStorage.getItem(KLJUC_JEZIKA)
  return spremljen === 'hr' || spremljen === 'en' ? spremljen : 'en'
}

// React "kontekst" — mjesto odakle svaka komponenta čita trenutni jezik i funkciju t().
const JezikContext = createContext(null)

export function JezikProvider({ children }) {
  const [jezik, setJezik] = useState(ucitajJezik())

  function postaviJezik(id) {
    localStorage.setItem(KLJUC_JEZIKA, id)
    document.documentElement.lang = id
    setJezik(id) // promjena stanja -> cijela aplikacija se ponovno iscrta na novom jeziku
  }

  // t('kljuc', { ime: vrijednost }) -> prevedeni tekst s ubačenim vrijednostima
  function t(kljuc, params) {
    let tekst = PRIJEVODI[jezik][kljuc] ?? PRIJEVODI.en[kljuc] ?? kljuc
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        tekst = tekst.replaceAll(`{${k}}`, v)
      }
    }
    return tekst
  }

  return (
    <JezikContext.Provider value={{ jezik, postaviJezik, t }}>
      {children}
    </JezikContext.Provider>
  )
}

// Kuka (hook) koju komponente zovu: const { t, jezik, postaviJezik } = useJezik()
export function useJezik() {
  return useContext(JezikContext)
}
