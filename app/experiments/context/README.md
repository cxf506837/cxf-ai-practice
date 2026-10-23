# 选中历史是否帮助理解通知？

**[先看结果与失败](RESULTS.md) · [网站图文说明](https://cxf-portfolio.onrender.com/works/context-experiment.html) · [应用源码](../../README.md)**

> 实验已结束。阅读公开日志和审阅材料即可复核；不要直接重跑付费运行器，也不要覆盖 `frozen.json` 或历史成绩。本次 README 整理没有新增模型调用。

这是独立实验，不修改生产提取提示。10个合成case：4个需要历史、3个当前信息完整、3个过时或冲突。A只看current，B另外看用户显式选中的1–2条同来源消息。同一prompt/schema/model，三轮顺序固定为AB、BA、AB，共60个计划请求，没有重试或失败补跑。

2026-10-12：冻结后完成60次真实调用，60次结构成功、0次请求失败；GPT-6 Astra / medium已按10个case三轮配对核对全部60份，cxf已看预先指定的五份并判断均暂不修改。语义遗漏保留，结构成功不等于语义全正确。完整结果、原日志、原报告、独立复核及参与事实见[RESULTS.md](RESULTS.md)。

1. cxf已核对user-labels.json的H01/S01修订答案及hypothesis；其余8例经高级只读预审。公开材料只记录参与事实，私人回复不导出。
2. 2026-10-12建立frozen.json，固定gold、提示、配置、计划与源码；7份依赖与冻结hash保持原字节。不覆盖冻结或调gold来改善结果。
3. 实际共同Redis与云HTTPS验收通过后，运行冻结三轮计划；每条成功/失败fsync保留。失败不补跑、不返预留。
4. 独立审查和用户核对另存，原run/report保留结束时pending/null。冻结词项预检不具有唯一预注册的最终语义布尔映射，复核是reviewer-operationalization-not-preregistered-final-score，不能回填为正式准确率。

A在不可见信息上合理留空不算幻觉，但完整上下文可能不完整。provenance须用messageId+精确quote覆盖每个确定字段，非空deadlineText须为可见原文子串；出处可定位仍不证明语义正确。词项lexicalPrecheck不能可靠判断额外动作、否定或同义词。

本轮已结束，不重新调用模型。原运行入口与失败分阶段记录仍保留供源码阅读：budget、request-validation、network、http、envelope-json、envelope、content-json、schema。预算预留不等于供应商账单，未知预留要查实际账本；60次估价0.083764元，保守预留12元。小型合成样本不能推广现实准确率。
