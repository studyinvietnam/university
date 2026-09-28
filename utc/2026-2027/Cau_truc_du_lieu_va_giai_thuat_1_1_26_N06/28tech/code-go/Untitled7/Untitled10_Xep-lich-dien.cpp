#include<bits/stdc++.h>

using namespace std;
using ll = long long;

bool cmp(pair<int, int> a, pair<int, int> b){
    return a.second < b.second;
}

int main(){
    freopen("input10.cpp", "r", stdin);
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Lỗi sai: Khai báo k nhưng phía dưới không sử dụng k.
    // Nếu đề bài có k thì đang thiếu logic xử lý liên quan đến k.
    int n, k;
    cin >> n >> k;
    pair<int, int> a[n];
    for(int i = 0; i < n; i++){
        cin >> a[i].first >> a[i].second;
    }
    // Ý tưởng đúng nếu bài là bài chọn nhiều khoảng không giao nhau nhất:
    // Chọn khoảng có thời gian kết thúc nhỏ nhất trước.
    sort(a, a + n, cmp);
    // Lỗi sai: Nếu n = 0 thì không được khởi tạo cnt = 1
    // và truy cập a[0].
    int cnt = 1;
    // Lỗi sai: Nếu n = 0 thì a[0] không tồn tại.
    int end_time = a[0].second;
    for(int i = 1; i < n; i++){
        // Nếu bài cho phép hoạt động mới bắt đầu đúng lúc
        // hoạt động cũ kết thúc thì >= là đúng.
        //
        // Nếu đề yêu cầu 2 khoảng không được chạm nhau
        // thì phải dùng > thay vì >=.
        if(a[i].first >= end_time){
            ++cnt;
            // Đúng: Sau khi chọn khoảng này,
            // phải cập nhật thời gian kết thúc thành thời gian
            // kết thúc của khoảng vừa chọn.
            end_time = a[i].second;
        }
    }
    cout << cnt << endl;
    return 0;
}