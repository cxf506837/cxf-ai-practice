# 选中历史是否帮助理解通知？

这是独立实验，不修改生产提取提示。10个合成case：4个需要历史、3个当前信息完整、3个过时或冲突。A只看current，B另外看用户显式选中的1–2条同来源消息。同一prompt/schema/model，三轮顺序固定为AB、BA、AB，共最多60个计划请求，没有重试或失败补跑。

1. 用户已核对user-labels.json的H01/S01修订答案及hypothesis；公开材料只记录这项事实。原参与回复仅保存在本轮系统临时私密目录，不随源码导出。
2. 高级模型只读审查剩余8例、A/B gold、schema、评分器及预算路径。ready后才设置CONTEXT_REVIEW_READY=yes。
3. 运行 `node experiments/context/runner.ts --freeze` 建立不可覆盖frozen.json，记录gold/源码/config/plan hash。后续任何hash改变拒绝运行。
4. 账户持有者配置共同Upstash账本与API环境，执行 `node experiments/context/runner.ts --run`。不使用旧scripts/evaluate.ts代跑；旧入口及本地其他应用不受此账本覆盖。
5. cxf亲自核对5份输出，高级模型按10个case的A/B配对核对全部三轮，不把60请求当60独立样本。公布全部失败，不调gold、不挑最好一轮。

最终语义指标分别为visibleFaithful、fullContextComplete、wrongCertain、wrongAssociation，实测后的人工复核完成前均保持null与semanticReview=pending。A在不可见信息上合理留空不算幻觉，但完整上下文可能不完整。机器只输出lexicalPrecheck词项提示，不能可靠判定新增动作或否定，不能作最终语义裁判。高级模型需要按10组case配对核对全部60份输出的动作、对象、材料数量/形式、否定、更正、日期原文、疑点及字段出处；用户5份核对另计。provenance用messageId+精确quote校验可见消息，非空deadlineText也必须是可见原文子串，不套用生产Candidate.evidence仅校验current的规则。

当前状态：两例修订金标已本人核对；剩余集高级预审、冻结、实测和5份输出核对待完成。不存在实测结论或60次结果。runner每条成功/失败fsync保留，报告latency median/p95、known usage保守价格估算与20分预留上界；超时或未知失败不返额度，token估算不冒称发票。

失败项按budget、request-validation、network、http、envelope-json、envelope、content-json、schema分阶段记录；有界合成响应、用量、请求及返回模型分别保留，若响应含实际key则隔离证据并仅记录标志。报告分别统计计划项、成功项、实际模型请求与确认预留次数；预算全拒绝是零模型请求，不算真实模型实验。
