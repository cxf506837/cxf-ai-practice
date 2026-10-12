# cxf的核对与独立复核

cxf已对照H01、S01的合成通知，核对助手整理的修订gold及hypothesis；其余8例采用预注册参考gold并接受高级只读预审。确认字段与冻结文件保持原字节，这不等于cxf独立完成全部标注。

冻结后按固定AB、BA、AB顺序完成三轮60次，失败保留、不补跑、不修改gold。cxf后来查看固定第一轮H01 A/B、S01 A/B和无需历史例N02 B共五份，均暂不修改。只公开[参与摘要](review/user-participation-summary.json)，私人聊天原文不导出。

GPT-6 Astra / medium独立逐份审阅全部60份输出，检查动作、对象、数量/形式、否定、更正、日期、疑点和出处。[原复核快照](review/semantic-review.md)保留当时用户核对pending；后来参与状态见[结果说明](RESULTS.md)。暂不修改是使用者判断，不替代语义检查，遗漏并列保留。

冻结评分器只有lexicalPrecheck词项提示与null语义字段，没有唯一预注册的最终语义布尔决策算法。独立审阅口径标为reviewer-operationalization-not-preregistered-final-score，原run/report不回填、不宣称正式准确率。S01 A的audience存在执行人/范围解释差异，完整限制见RESULTS.md。
