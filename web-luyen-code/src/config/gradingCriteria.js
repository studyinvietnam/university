const defaultGradingCriteria = {
    correctness: {
        weight: 50,
        description: 'Code có giải quyết đúng yêu cầu bài toán hay không.',
    },
    codeQuality: {
        weight: 20,
        description: 'Code rõ ràng, dễ đọc, đặt tên hợp lý.',
    },
    performance: {
        weight: 15,
        description: 'Đánh giá thời gian và bộ nhớ.',
    },
    edgeCases: {
        weight: 10,
        description: 'Xử lý các trường hợp đặc biệt và biên.',
    },
    safety: {
        weight: 5,
        description: 'Không có lỗi hoặc hành vi bất thường rõ ràng.',
    },
};

module.exports = defaultGradingCriteria;