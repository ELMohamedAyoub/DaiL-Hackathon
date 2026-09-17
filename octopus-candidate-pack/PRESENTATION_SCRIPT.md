Here's the problem we kept running into, in both of these prototypes. The evidence a decision needs usually already exists somewhere. It just doesn't reliably turn into the right next action for the person who has to decide. So we built two small cases to test one idea: can we take messy evidence and route it to a human cleanly, without pretending to make the call ourselves.

This is C07. First, APP-1. It's a clean near-miss. Everything lines up except one item is missing, and the tool says exactly that. Now APP-2. Here the organization name doesn't match across sources. It's ambiguous. The tool flags it and stops. It does not auto-resolve it. That's the whole point. In both cases the tool never approves and never rejects. It only routes the case to a human reviewer with the reason attached.

Now C08. Here we have four sources that contradict each other. The plan says a target of twenty. Actual attendance is twelve. There's a voice note that corrects itself partway through. And the completion assessment is missing entirely. The report cites every single number back to the source it came from, and where something isn't there, it says "not stated." It doesn't guess. It doesn't fill the gap to look complete.

I want to be explicit about what's real and what isn't. Real: the rules engine, the live API, and the user interface. Simulated: the application and evidence data, the reviewer identity, and the approval action itself. No real client data is anywhere in this.

One hypothesis is still unvalidated. Right now the evidence is static JSON. The open question is whether real document and evidence extraction can feed this same pipeline. That's what we'd test next.
