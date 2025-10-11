module.exports = function (RED) {

    function makeMatcher(filter, fallbackExact) {
        if (filter && typeof filter === "string" && filter.length) {
            if (filter.startsWith("/") && filter.endsWith("/")) {
                try {
                    const re = new RegExp(filter.slice(1, -1));
                    return t => typeof t === "string" && re.test(t);
                } catch { return () => false; }
            }
            if (filter.includes("*")) {
                const esc = s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
                const re = new RegExp("^" + esc(filter).replace(/\*/g, ".*") + "$");
                return t => typeof t === "string" && re.test(t);
            }
            return t => t === filter;
        }
        return t => t === fallbackExact;
    }

    function BK9100Node(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const cards = Array.isArray(config.cards) ? config.cards : [];
        const routes = cards.map(c => ({
            type:  c.type  || "",
            label: c.label || "",
            filter:c.filter|| "",
            match: makeMatcher(c.filter || "", c.type || "")
        }));

        node.status({ fill: "grey", shape: "dot", text: `${routes.length} outputs` });

        node.on('input', function (msg, send, done) {
            try {
                const topic = msg.topic;
                const outs = new Array(routes.length).fill(null);
                let hits = 0;

                routes.forEach((r, i) => {
                    if (r.match(topic)) { outs[i] = msg; hits++; }
                });

                if (typeof topic === "string") {
                    node.status({
                        fill: hits ? "green" : "yellow",
                        shape: hits ? "dot" : "ring",
                        text: `${topic} → ${hits}/${routes.length}`
                    });
                } else {
                    node.status({ fill: "blue", shape: "dot", text: `${hits} match(es)` });
                }

                send(outs);
                done && done();
            } catch (err) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                done ? done(err) : node.error(err, msg);
            }
        });
    }

    RED.nodes.registerType("BK9100", BK9100Node);
};
