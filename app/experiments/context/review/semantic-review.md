# 真实调用上下文A/B独立语义复核

run: 4f1c648c-6ec5-4f19-a0ff-d3c1408906c1。已逐条阅读全部60份输出，按10个case三轮配对；用户五份核对仍pending。原run/report/gold/config/frozen均不改。

## 判分口径与限制

- status: reviewer-operationalization-not-preregistered-final-score
- visibleFaithful: 所有可见输入上的确定断言、疑点及其出处在语义上受支持；合理省略不单独使本指标失败。出处须覆盖确定字段。未解析指代若显式承认不确定，记忠实但另记字段规范偏差。
- fullContextComplete: goldB的实质动作、对象、日期、材料要点全部进入任务字段，保留已知数量/形式/签字/规格；数量可在title或materials，不能仅藏在provenance。无新增错误动作。合理A留空仍可不完整。出处完整性单列进visibleFaithful；否则S01B的内容补全会与出处问题混淆。
- wrongCertain: 任务确定字段把无证据或更正失效的具体内容写为事实；不把带明确疑点的指代占位算幻觉，不把纯遗漏算错误确定化。
- wrongAssociation: 把另一活动或已被当前更正取消的历史信息作为现任务生效要求；否定语境和作为出处的原文不算误关联。
- 预注册代码仅有词项预检和null语义字段，没有唯一的人工布尔决策算法；以下是独立审阅口径，不回填正式成绩。
- fullContextComplete以已冻结goldB信息和提示明确要求为主；H01接收人班主任、H03活动邮箱也单列缺失，但不额外改变goldB之外的统计门槛。
- S02的交/提交电子照片视为发送的语义近似，不因标题未含发字判错；仍建议保留发送原词。
- S03日期待定和null按goldB通过，遗漏这几天的粗粒度时间另记，不当作凭空确定日期。
- H02A保留上述成员且明确解释不明，非幻觉；但提示要求留空，记录字段规范偏差。
- S01A二年级指活动范围，不能确定执行人，且无疑点，按错误确定化处理；若用户接受它仅作为范围标签，则计数会改变，须保留此敏感性。
- 否定约束可由当前有效电子材料替代旧纸质要求来体现，不强求新增负向字段。

## 结论

B在H01补全了两项材料、H02补全对象及签字/纸质表、H04补全照片规格、S01补全家长对象；但H03三轮完全未利用PDF历史，H02均漏数量，H04第三轮漏数量，S01对象出处始终缺失。不能据此宣称所有语义正确或现实准确率提升。无需历史组没有稳定优势，N02数量遗漏在A/B均出现。未观察到旧日期/旧材料/另一活动的生效误关联，但仅3个冲突case不能证明普遍免疫。

以下计数是明示解释口径下的重复输出描述，不是唯一预注册正式成绩，不做显著性或总体准确率推断。

|组|variant|独立case数|重复输出数|visibleFaithful true|fullContextComplete true|wrongCertain true|wrongAssociation true|
|---|---|---:|---:|---:|---:|---:|---:|
|needs-history|A|4|12|12|0|0|0|
|needs-history|B|4|12|9|5|0|0|
|no-history-needed|A|3|9|9|7|0|0|
|no-history-needed|B|3|9|9|7|0|0|
|stale-or-conflicting|A|3|9|6|6|3|0|
|stale-or-conflicting|B|3|9|6|9|0|0|

A: {"variant":"A","observedRepeatedOutputs":30,"visibleFaithful":27,"fullContextComplete":13,"wrongCertain":3,"wrongAssociation":0}
B: {"variant":"B","observedRepeatedOutputs":30,"visibleFaithful":24,"fullContextComplete":21,"wrongCertain":0,"wrongAssociation":0}

## 十组逐轮配对

|case|round|A 忠实/完整/错误确定/误关联|B 忠实/完整/错误确定/误关联|
|---|---:|---|---|
|H01|1|是/否/否/否|是/是/否/否|
|H01|2|是/否/否/否|是/是/否/否|
|H01|3|是/否/否/否|是/是/否/否|
|H02|1|是/否/否/否|是/否/否/否|
|H02|2|是/否/否/否|是/否/否/否|
|H02|3|是/否/否/否|是/否/否/否|
|H03|1|是/否/否/否|否/否/否/否|
|H03|2|是/否/否/否|否/否/否/否|
|H03|3|是/否/否/否|否/否/否/否|
|H04|1|是/否/否/否|是/是/否/否|
|H04|2|是/否/否/否|是/是/否/否|
|H04|3|是/否/否/否|是/否/否/否|
|N01|1|是/是/否/否|是/是/否/否|
|N01|2|是/是/否/否|是/是/否/否|
|N01|3|是/是/否/否|是/是/否/否|
|N02|1|是/否/否/否|是/否/否/否|
|N02|2|是/是/否/否|是/否/否/否|
|N02|3|是/否/否/否|是/是/否/否|
|N03|1|是/是/否/否|是/是/否/否|
|N03|2|是/是/否/否|是/是/否/否|
|N03|3|是/是/否/否|是/是/否/否|
|S01|1|否/否/是/否|否/是/否/否|
|S01|2|否/否/是/否|否/是/否/否|
|S01|3|否/否/是/否|否/是/否/否|
|S02|1|是/是/否/否|是/是/否/否|
|S02|2|是/是/否/否|是/是/否/否|
|S02|3|是/是/否/否|是/是/否/否|
|S03|1|是/是/否/否|是/是/否/否|
|S03|2|是/是/否/否|是/是/否/否|
|S03|3|是/是/否/否|是/是/否/否|

## 逐份审查证据

### H01/R1/A（原jsonl第2行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 保留两份报名材料；明确未知材料明细。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 保留2026年10月13日17:00前及2026-10-13，没有丢17:00。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 明细未知合理，不据此记幻觉。
- 备注: 相对完整历史缺报名表与缴费凭证；当前可见内容忠实。

### H01/R1/B（原jsonl第3行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 材料明确为报名表、缴费凭证；title保留两份。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 保留2026年10月13日17:00前及2026-10-13，没有丢17:00。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 说明材料明细来自历史是来源说明，不否定已获得的信息。
- 备注: 历史成功补全两项材料；未额外生成填写/缴费动作。班主任只在部分出处出现，未提取为接收方，gold无接收方字段，作为完整性边界提示。

### H02/R1/A（原jsonl第4行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: audience=上述成员，uncertainties明确具体指哪些人不明确；不构成虚构具体对象。
- materials: materials仅该表；一份信息在uncertainties中承认，但名称/形式/签字不可从A确定。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 提示要求未知对象留空，本输出是可见指代占位，存在字段规范偏差；不将其算幻觉。

### H02/R1/B（原jsonl第5行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 科研小组成员由H02-old支持。
- materials: 导师签字、纸质、立项表均正确，但title/materials均漏一份；一份只在出处。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 上下文补全对象与表格性质，但三轮均遗漏数量，不能判完整。

### H03/R1/A（原jsonl第6行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: A只知承诺书，格式未知是合理保留。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 当前已输出字段出处充分。
- uncertainties: 格式与渠道未明确的疑点受当前可见输入支持。
- 备注: fullContextComplete不通过不意味着A幻觉。

### H03/R1/B（原jsonl第7行）

visibleFaithful=false；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: history明确健康承诺书、电子PDF，但只提承诺书；漏名称限定与格式。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 只引current，未利用H03-old补全。
- uncertainties: 声称格式/发送方式未明确，与H03-old明确电子PDF和活动邮箱矛盾。
- 备注: 三轮B均未得到该历史应有的补全；这是遗漏及虚假不确定，不是新增具体日期/材料的错误确定化。

### H04/R1/A（原jsonl第8行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 规格/数量/提交方式未知，合理留疑点。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 缺历史中规格与形式，完整性不通过。

### H04/R1/B（原jsonl第9行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 一张/一寸/蓝底/电子JPG齐全。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 提交讲座照片按参与讲座者照片的简写解读；一寸/蓝底说明是证件照，没有断言拍摄讲座现场。

### N01/R1/A（原jsonl第10行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 电子签到表正确，原文无数量。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无关天气历史没有影响输出。

### N01/R1/B（原jsonl第11行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 电子签到表正确，原文无数量。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无关天气历史没有影响输出。

### N02/R1/A（原jsonl第12行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 本人签字/纸质/接送授权书正确，但任务字段漏一份；出处的数量不替代提取。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无需历史；同一case存在数量保留的轮次波动，不应解释为B稳定提升。

### N02/R1/B（原jsonl第13行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 本人签字/纸质/接送授权书正确，但任务字段漏一份；出处的数量不替代提取。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无需历史；同一case存在数量保留的轮次波动，不应解释为B稳定提升。

### N03/R1/A（原jsonl第14行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: tasks=[]，闲聊未生成任务。
- audience: 不适用，无任务。
- materials: 不适用，无任务。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 不适用，无任务；今晚未误成待办截止时间。
- provenance: 空任务无需出处。
- uncertainties: 未发现无依据确定化。
- 备注: A/B三轮均正确返回空任务。

### N03/R1/B（原jsonl第15行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: tasks=[]，闲聊未生成任务。
- audience: 不适用，无任务。
- materials: 不适用，无任务。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 不适用，无任务；今晚未误成待办截止时间。
- provenance: 空任务无需出处。
- uncertainties: 未发现无依据确定化。
- 备注: A/B三轮均正确返回空任务。

### S01/R1/A（原jsonl第16行）

visibleFaithful=false；fullContextComplete=false；wrongCertain=true；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: audience=二年级，把活动范围填成确定执行对象；缺家长依据且uncertainties为空。
- materials: 材料名称/形式/数量与可见输入核对。
- negationCorrection: 采用10月14日、在线电子表；未要求旧10月12日或纸质表。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: current支持活动范围、动作、日期、电子表，但不支持确定执行人。
- uncertainties: 未发现无依据确定化。
- 备注: 应保留执行人不确定；与已确认goldA空audience不一致。

### S01/R1/B（原jsonl第17行）

visibleFaithful=false；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 二年级家长受可见HISTORY支持，内容正确。
- materials: 材料名称/形式/数量与可见输入核对。
- negationCorrection: 采用10月14日、在线电子表；未要求旧10月12日或纸质表。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 仅引S01-current，不含支持家长的S01-old；精确子串检查通过不能证明覆盖所有字段。
- uncertainties: 未发现无依据确定化。
- 备注: 历史补全对象成功，但未引用对象出处，不能判visibleFaithful通过。

### S02/R1/A（原jsonl第18行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 交/提交电子照片视为发送的近义表述；原quote含发送。
- audience: 对象与可见通知相符。
- materials: 一张电子照片；没有三张或纸质的生效断言。
- negationCorrection: 新日期10月20日、电子一张覆盖旧10月18日纸质三张。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 按语义判断通过，词项发匹配失败不能直接推导动作错误；建议后续提取保留发送原词。

### S02/R1/B（原jsonl第19行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 交/提交电子照片视为发送的近义表述；原quote含发送。
- audience: 对象与可见通知相符。
- materials: 一张电子照片；没有三张或纸质的生效断言。
- negationCorrection: 新日期10月20日、电子一张覆盖旧10月18日纸质三张。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 按语义判断通过，词项发匹配失败不能直接推导动作错误；建议后续提取保留发送原词。

### S03/R1/A（原jsonl第20行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 美术组家长，无舞蹈组混入。
- materials: 作品清单，无舞蹈服尺码表混入。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineDate=null且明确具体截止时间待定；deadlineText未保留这几天，记录粗时间遗漏但按gold日期待定通过。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 未将另一活动10月15日套入本次；未凭今日推导日期。

### S03/R1/B（原jsonl第21行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 美术组家长，无舞蹈组混入。
- materials: 作品清单，无舞蹈服尺码表混入。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineDate=null且明确具体截止时间待定；deadlineText未保留这几天，记录粗时间遗漏但按gold日期待定通过。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 未将另一活动10月15日套入本次；未凭今日推导日期。

### H01/R2/B（原jsonl第22行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 材料明确为报名表、缴费凭证；title保留两份。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 保留2026年10月13日17:00前及2026-10-13，没有丢17:00。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 说明材料明细来自历史是来源说明，不否定已获得的信息。
- 备注: 历史成功补全两项材料；未额外生成填写/缴费动作。班主任只在部分出处出现，未提取为接收方，gold无接收方字段，作为完整性边界提示。

### H01/R2/A（原jsonl第23行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 保留两份报名材料；明确未知材料明细。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 保留2026年10月13日17:00前及2026-10-13，没有丢17:00。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 明细未知合理，不据此记幻觉。
- 备注: 相对完整历史缺报名表与缴费凭证；当前可见内容忠实。

### H02/R2/B（原jsonl第24行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 科研小组成员由H02-old支持。
- materials: 导师签字、纸质、立项表均正确，但title/materials均漏一份；一份只在出处。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 上下文补全对象与表格性质，但三轮均遗漏数量，不能判完整。

### H02/R2/A（原jsonl第25行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: audience=上述成员，uncertainties明确具体指哪些人不明确；不构成虚构具体对象。
- materials: materials仅该表；一份信息在uncertainties中承认，但名称/形式/签字不可从A确定。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 提示要求未知对象留空，本输出是可见指代占位，存在字段规范偏差；不将其算幻觉。

### H03/R2/B（原jsonl第26行）

visibleFaithful=false；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: history明确健康承诺书、电子PDF，但只提承诺书；漏名称限定与格式。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 只引current，未利用H03-old补全。
- uncertainties: 声称格式/发送方式未明确，与H03-old明确电子PDF和活动邮箱矛盾。
- 备注: 三轮B均未得到该历史应有的补全；这是遗漏及虚假不确定，不是新增具体日期/材料的错误确定化。

### H03/R2/A（原jsonl第27行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: A只知承诺书，格式未知是合理保留。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 当前已输出字段出处充分。
- uncertainties: 格式与渠道未明确的疑点受当前可见输入支持。
- 备注: fullContextComplete不通过不意味着A幻觉。

### H04/R2/B（原jsonl第28行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 一张/一寸/蓝底/电子JPG齐全。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 提交讲座照片按参与讲座者照片的简写解读；一寸/蓝底说明是证件照，没有断言拍摄讲座现场。

### H04/R2/A（原jsonl第29行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 规格/数量/提交方式未知，合理留疑点。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 缺历史中规格与形式，完整性不通过。

### N01/R2/B（原jsonl第30行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 电子签到表正确，原文无数量。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无关天气历史没有影响输出。

### N01/R2/A（原jsonl第31行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 电子签到表正确，原文无数量。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无关天气历史没有影响输出。

### N02/R2/B（原jsonl第32行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 本人签字/纸质/接送授权书正确，但任务字段漏一份；出处的数量不替代提取。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无需历史；同一case存在数量保留的轮次波动，不应解释为B稳定提升。

### N02/R2/A（原jsonl第33行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: title保留一份，materials保留本人签字、纸质接送授权书。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无需历史；同一case存在数量保留的轮次波动，不应解释为B稳定提升。

### N03/R2/B（原jsonl第34行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: tasks=[]，闲聊未生成任务。
- audience: 不适用，无任务。
- materials: 不适用，无任务。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 不适用，无任务；今晚未误成待办截止时间。
- provenance: 空任务无需出处。
- uncertainties: 未发现无依据确定化。
- 备注: A/B三轮均正确返回空任务。

### N03/R2/A（原jsonl第35行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: tasks=[]，闲聊未生成任务。
- audience: 不适用，无任务。
- materials: 不适用，无任务。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 不适用，无任务；今晚未误成待办截止时间。
- provenance: 空任务无需出处。
- uncertainties: 未发现无依据确定化。
- 备注: A/B三轮均正确返回空任务。

### S01/R2/B（原jsonl第36行）

visibleFaithful=false；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 二年级家长受可见HISTORY支持，内容正确。
- materials: 材料名称/形式/数量与可见输入核对。
- negationCorrection: 采用10月14日、在线电子表；未要求旧10月12日或纸质表。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 仅引S01-current，不含支持家长的S01-old；精确子串检查通过不能证明覆盖所有字段。
- uncertainties: 未发现无依据确定化。
- 备注: 历史补全对象成功，但未引用对象出处，不能判visibleFaithful通过。

### S01/R2/A（原jsonl第37行）

visibleFaithful=false；fullContextComplete=false；wrongCertain=true；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: audience=二年级，把活动范围填成确定执行对象；缺家长依据且uncertainties为空。
- materials: 材料名称/形式/数量与可见输入核对。
- negationCorrection: 采用10月14日、在线电子表；未要求旧10月12日或纸质表。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: current支持活动范围、动作、日期、电子表，但不支持确定执行人。
- uncertainties: 未发现无依据确定化。
- 备注: 应保留执行人不确定；与已确认goldA空audience不一致。

### S02/R2/B（原jsonl第38行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 交/提交电子照片视为发送的近义表述；原quote含发送。
- audience: 对象与可见通知相符。
- materials: 一张电子照片；没有三张或纸质的生效断言。
- negationCorrection: 新日期10月20日、电子一张覆盖旧10月18日纸质三张。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 按语义判断通过，词项发匹配失败不能直接推导动作错误；建议后续提取保留发送原词。

### S02/R2/A（原jsonl第39行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 交/提交电子照片视为发送的近义表述；原quote含发送。
- audience: 对象与可见通知相符。
- materials: 一张电子照片；没有三张或纸质的生效断言。
- negationCorrection: 新日期10月20日、电子一张覆盖旧10月18日纸质三张。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 按语义判断通过，词项发匹配失败不能直接推导动作错误；建议后续提取保留发送原词。

### S03/R2/B（原jsonl第40行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 美术组家长，无舞蹈组混入。
- materials: 作品清单，无舞蹈服尺码表混入。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineDate=null且明确具体截止时间待定；deadlineText未保留这几天，记录粗时间遗漏但按gold日期待定通过。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 未将另一活动10月15日套入本次；未凭今日推导日期。

### S03/R2/A（原jsonl第41行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 美术组家长，无舞蹈组混入。
- materials: 作品清单，无舞蹈服尺码表混入。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineDate=null且明确具体截止时间待定；deadlineText未保留这几天，记录粗时间遗漏但按gold日期待定通过。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 未将另一活动10月15日套入本次；未凭今日推导日期。

### H01/R3/A（原jsonl第42行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 保留两份报名材料；明确未知材料明细。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 保留2026年10月13日17:00前及2026-10-13，没有丢17:00。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 明细未知合理，不据此记幻觉。
- 备注: 相对完整历史缺报名表与缴费凭证；当前可见内容忠实。

### H01/R3/B（原jsonl第43行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 材料明确为报名表、缴费凭证；title保留两份。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 保留2026年10月13日17:00前及2026-10-13，没有丢17:00。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 说明材料明细来自历史是来源说明，不否定已获得的信息。
- 备注: 历史成功补全两项材料；未额外生成填写/缴费动作。班主任只在部分出处出现，未提取为接收方，gold无接收方字段，作为完整性边界提示。

### H02/R3/A（原jsonl第44行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: audience=上述成员，uncertainties明确具体指哪些人不明确；不构成虚构具体对象。
- materials: materials仅该表；一份信息在uncertainties中承认，但名称/形式/签字不可从A确定。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 提示要求未知对象留空，本输出是可见指代占位，存在字段规范偏差；不将其算幻觉。

### H02/R3/B（原jsonl第45行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 科研小组成员由H02-old支持。
- materials: 导师签字、纸质、立项表均正确，但title/materials均漏一份；一份只在出处。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 上下文补全对象与表格性质，但三轮均遗漏数量，不能判完整。

### H03/R3/A（原jsonl第46行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: A只知承诺书，格式未知是合理保留。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 当前已输出字段出处充分。
- uncertainties: 格式与渠道未明确的疑点受当前可见输入支持。
- 备注: fullContextComplete不通过不意味着A幻觉。

### H03/R3/B（原jsonl第47行）

visibleFaithful=false；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: history明确健康承诺书、电子PDF，但只提承诺书；漏名称限定与格式。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 只引current，未利用H03-old补全。
- uncertainties: 声称格式/发送方式未明确，与H03-old明确电子PDF和活动邮箱矛盾。
- 备注: 三轮B均未得到该历史应有的补全；这是遗漏及虚假不确定，不是新增具体日期/材料的错误确定化。

### H04/R3/A（原jsonl第48行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 规格/数量/提交方式未知，合理留疑点。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 缺历史中规格与形式，完整性不通过。

### H04/R3/B（原jsonl第49行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 一寸/蓝底/电子JPG正确；漏一张，仅出处保留数量。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 提交讲座照片按参与讲座者照片的简写解读；一寸/蓝底说明是证件照，没有断言拍摄讲座现场。

### N01/R3/A（原jsonl第50行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 电子签到表正确，原文无数量。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无关天气历史没有影响输出。

### N01/R3/B（原jsonl第51行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 电子签到表正确，原文无数量。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无关天气历史没有影响输出。

### N02/R3/A（原jsonl第52行）

visibleFaithful=true；fullContextComplete=false；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: 本人签字/纸质/接送授权书正确，但任务字段漏一份；出处的数量不替代提取。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无需历史；同一case存在数量保留的轮次波动，不应解释为B稳定提升。

### N02/R3/B（原jsonl第53行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 对象与可见通知相符。
- materials: title保留一份，materials保留本人签字、纸质接送授权书。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 无需历史；同一case存在数量保留的轮次波动，不应解释为B稳定提升。

### N03/R3/A（原jsonl第54行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: tasks=[]，闲聊未生成任务。
- audience: 不适用，无任务。
- materials: 不适用，无任务。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 不适用，无任务；今晚未误成待办截止时间。
- provenance: 空任务无需出处。
- uncertainties: 未发现无依据确定化。
- 备注: A/B三轮均正确返回空任务。

### N03/R3/B（原jsonl第55行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: tasks=[]，闲聊未生成任务。
- audience: 不适用，无任务。
- materials: 不适用，无任务。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: 不适用，无任务；今晚未误成待办截止时间。
- provenance: 空任务无需出处。
- uncertainties: 未发现无依据确定化。
- 备注: A/B三轮均正确返回空任务。

### S01/R3/A（原jsonl第56行）

visibleFaithful=false；fullContextComplete=false；wrongCertain=true；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: audience=二年级，把活动范围填成确定执行对象；缺家长依据且uncertainties为空。
- materials: 材料名称/形式/数量与可见输入核对。
- negationCorrection: 采用10月14日、在线电子表；未要求旧10月12日或纸质表。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: current支持活动范围、动作、日期、电子表，但不支持确定执行人。
- uncertainties: 未发现无依据确定化。
- 备注: 应保留执行人不确定；与已确认goldA空audience不一致。

### S01/R3/B（原jsonl第57行）

visibleFaithful=false；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 二年级家长受可见HISTORY支持，内容正确。
- materials: 材料名称/形式/数量与可见输入核对。
- negationCorrection: 采用10月14日、在线电子表；未要求旧10月12日或纸质表。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 仅引S01-current，不含支持家长的S01-old；精确子串检查通过不能证明覆盖所有字段。
- uncertainties: 未发现无依据确定化。
- 备注: 历史补全对象成功，但未引用对象出处，不能判visibleFaithful通过。

### S02/R3/A（原jsonl第58行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 交/提交电子照片视为发送的近义表述；原quote含发送。
- audience: 对象与可见通知相符。
- materials: 一张电子照片；没有三张或纸质的生效断言。
- negationCorrection: 新日期10月20日、电子一张覆盖旧10月18日纸质三张。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 按语义判断通过，词项发匹配失败不能直接推导动作错误；建议后续提取保留发送原词。

### S02/R3/B（原jsonl第59行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 交/提交电子照片视为发送的近义表述；原quote含发送。
- audience: 对象与可见通知相符。
- materials: 一张电子照片；没有三张或纸质的生效断言。
- negationCorrection: 新日期10月20日、电子一张覆盖旧10月18日纸质三张。
- time: deadlineText为可见原文，完整日期正确归一化；未使用今日补日期。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 按语义判断通过，词项发匹配失败不能直接推导动作错误；建议后续提取保留发送原词。

### S03/R3/A（原jsonl第60行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 美术组家长，无舞蹈组混入。
- materials: 作品清单，无舞蹈服尺码表混入。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineDate=null且明确具体截止时间待定；deadlineText未保留这几天，记录粗时间遗漏但按gold日期待定通过。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 未将另一活动10月15日套入本次；未凭今日推导日期。

### S03/R3/B（原jsonl第61行）

visibleFaithful=true；fullContextComplete=true；wrongCertain=false；wrongAssociation=false

- action: 仅有当前要求的一项动作；无新增独立历史任务。
- audience: 美术组家长，无舞蹈组混入。
- materials: 作品清单，无舞蹈服尺码表混入。
- negationCorrection: 无把否定或过期信息转成生效要求。
- time: deadlineDate=null且明确具体截止时间待定；deadlineText未保留这几天，记录粗时间遗漏但按gold日期待定通过。
- provenance: 引用均为可见messageId和精确子串；覆盖确定字段。
- uncertainties: 未发现无依据确定化。
- 备注: 未将另一活动10月15日套入本次；未凭今日推导日期。

## 冻结与运行事实

冻结SHA256: ae54b7c947fed44824e22ad98b6065adcc5917366daab445e4484e3c5c4cb739。7个依赖hash均匹配=true；60条与冻结顺序一致=true；响应content与tasks一致=true。

60请求成功、60预留、失败0；returnedModel均为deepseek-flash别名，不能确定固定底层版本。token保守估价0.083764元，60次正式预留1200分不是实付账单、不能退款/重置。源报告全尝试median=720.5ms/P95=903ms，分母60次尝试；语义分析分母是10个case的三轮配对，不混用。未额外调用模型、未补跑。

用户核对见user-five-check.md/json，必须由用户填；本高级模型审阅不代替用户判断。上述样本不证明RAG、长期记忆或真实聊天表现。
## S01 A边界解释：主表不是唯一结论

S01 A三轮audience均为“二年级”。主表按audience表示执行人处理：已确认goldA为空，提示要求不足确定留空并说明，而输出无疑点，所以记wrongCertain=true。core.ts对非空且不等于goldA的对象会给词项预警，但预警不是语义结论。

另一合理解释是audience仅表示年级范围：“二年级”确在当前消息，模型并未凭空写出“家长”或“学生”。在此解释下，三份均可记wrongCertain=false、visibleFaithful=true；仍未完整确定实际执行人，fullContextComplete=false。不能据主表武断说模型捏造了3个身份。

因此A总体visibleFaithful为27–30/30、wrongCertain为0–3/30；冲突组A对应6–9/9与0–3/9。这是同一case三次重复的解释敏感性范围，不是统计置信区间。B主表不受此边界影响。来源不足仍使S01 B三轮visibleFaithful=false，即使对象值正确。
