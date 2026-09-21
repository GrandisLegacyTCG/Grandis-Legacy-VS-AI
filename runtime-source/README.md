# Shared Runtime Source

**Editable application deployment home.** Shared Runtime v1.94.2 is propagated from OSA v1.9.4 and contains the OSA v1.9.4 canonical Attachment lifecycle correction, including Triple Shot this-turn countdown semantics and null-safe Attachment counters. The only deployment-path adaptation is the blind-selection helper import (`Authority/Digital/Blind-Choice` in OSA is colocated as `runtime/digital/` here); helper bytes are copied from OSA unchanged. VS AI and Tutorial consume this same source; gameplay data and Starter compositions remain unchanged.
