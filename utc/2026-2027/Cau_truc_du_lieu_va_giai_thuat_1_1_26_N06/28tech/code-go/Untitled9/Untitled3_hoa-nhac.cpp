#include<bits/stdc++.h>

using namespace std;
using ll = long long;

//se.upper_bound(x)
//upper_bound(se.begin(), se.end(), x)

//multiset: hoạt động giống như std::set nhưng cho phép lưu trữ nhiều phần tử có giá trị trùng lặp

int main(){
	freopen("input3.cpp", "r", stdin);
	int n, m; cin >> n >> m;
	multiset<int> ms;
	for(int i = 0; i < n; i++){
	    int x; cin >> x;
	    ms.insert(x);
	}
	for(int i = 0; i < m; i++){
	    int x; cin >> x;
	    auto it = ms.upper_bound(x);
	    if(it == ms.begin()) cout << "-1\n";
	    else{
	        --it;
	        cout << *it << endl;
	        ms.erase(it);
	    }
	}
	return 0;
}