// gidStorage.js
const gidStorage = {
    gid: 'No GID',

    setGid(gid) {
        this.gid = gid;
    },

    getGid() {
        return this.gid;
    }
};

module.exports = gidStorage;