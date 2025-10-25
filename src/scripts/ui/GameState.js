export default {
    currentLevel: 1,
    kidMaxHealth: 3,
    kidHealth: 3,
    kidHasSword: true,
    timeLeft: 3600000,
    // persisted shoe color (index)
    kidShoeColor: 0,
    load() {
        try {
            const v = localStorage.getItem('princejs.kidShoeColor');
            if (v !== null) this.kidShoeColor = parseInt(v);
        } catch (e) {}
    },
    save() {
        try { localStorage.setItem('princejs.kidShoeColor', this.kidShoeColor); } catch (e) {}
    }
}