#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int chon;
    cout << "Vui long chon case: " << flush;
    cin >> chon;
    switch(chon){
        // ------------------------------------
        case 1:{
            //28tech.com.vn
            //28tech.com.vn
            //28tech.com.vn
            //facebook.com
            //facebook.com
            //youtube.com
            //28tech.com.vn
            //oj.28tech.com.vn
            //oj.28tech.com.vn
            freopen("Untitled2-input1.txt", "r", stdin);
            map<string, int> mp6;
            string s;
            while(getline(cin, s)){
                mp6[s]++;
            }
            for(auto it : mp6){
                cout << it.first << " " << it.second << endl;
            }
            break;
        }
        // ------------------------------------
        case 2:{
            /* đọc dữ liệu đến khi gặp EOF (End Of File) */
            //	x = 22
            //	1 8 9 1 2 3 1 3
            //	1 9 3 9 12 1 8128 182
            //	1238 813 81293 1923723
            //	382 823923
            freopen("Untitled2-input2.txt", "r", stdin);
            int x3;
            while(cin >> x3){
                cout << x3 << " ";
            }
            break;
        }
        // ------------------------------------
        case 3:{
            map<int, int> mp5; //pair<int, int>
//          map<string, int> mp; //pair<string, int>
//          map<ll, char> mp; //pair<ll, char>
            mp5.insert({1, 2}); // (1, 2)
            mp5.insert({2, 3}); // (1, 2), (2, 3)
            mp5.insert({3, 4}); // (1, 2), (2, 3), (3, 4)
            mp5.insert({1, 5});
            mp5.insert({3, 3});
            mp5.insert({4, 1}); // (1, 2), (2, 3), (3, 4), (4, 1)
            cout << endl;
            auto it1 = mp5.find(2);
            mp5.erase(it1);
            for(auto it1 : mp5){
                cout << it1.first << " " << it1.second << endl;
            }
            break;
        }
        // ------------------------------------
        case 4:{
            map<int, int> mp; //pair<int, int>
//          map<string, int> mp; //pair<string, int>
//          map<ll, char> mp; //pair<ll, char>
            mp.insert({1, 2}); // (1, 2)
            mp.insert({2, 3}); // (1, 2), (2, 3)
            mp.insert({3, 4}); // (1, 2), (2, 3), (3, 4)
            mp.insert({1, 5});
            mp.insert({3, 3});
            mp.insert({4, 1}); // (1, 2), (2, 3), (3, 4), (4, 1)
            map<int, int>::iterator it = mp.find(3);
            if(it == mp.end())
                cout << "NOT FOUND\n";
            else
                cout << "FOUND\n";
            cout << endl;
            for(pair<int, int> it : mp){
            //for(auto it : mp)
                cout << it.first << " " << it.second << endl;
            }
            cout << endl;
            for(map<int,int>::iterator it = mp.begin(); it != mp.end(); it++){
//              cout << (*it).first << " " << (*it).second << endl;
                cout << it->first << " " << it->second << endl;
            }
            cout << endl;
            for(auto it = mp.rbegin(); it != mp.rend(); it++){
            // for(map<int,int>::reverse_iterator it = mp.rbegin(); it != mp.rend(); it+
                cout << it->first << " " << it->second << endl;
            }
            cout << endl;
            for(pair<int, int> item : mp){
                cout << item.first << " " << mp[item.first]<< endl;
            }
            cout << endl;
            cout << mp.size() << endl;
            mp[4] = 100;
            cout << mp.size() << endl;
            mp[-5] = 20;
            cout << mp.size() << endl;
            // In giá trị
            cout << mp[1] << endl;
            cout << mp[4] << endl;
            cout << mp[-5] << endl;
            cout << endl;
            cout << endl;
            break;
        }
        // ------------------------------------
        case 5:{
            map<int, int> mp4;  //
//          6
//          -1 -1 0 0 -1 2
            int n4;
            cin >> n4;
            int a1[n4];
            for(int i = 0; i < n4; i++){
                cin >> a1[i];
                mp4[a1[i]]++;
            }
            cout << endl;
            for(int x : a1){
                if(mp4[x] != 0){
                    cout << x << " " << mp4[x] << endl;
                    mp4[x] = 0;
                }
            }
            cout << endl;
            for(auto it : mp4){
                if(it.second % 2 == 0)
                    cout << it.first << " " << it.second << endl;
            }
            cout << endl;
            for(auto it = mp4.rbegin(); it != mp4.rend(); it++){
                if(it->second % 2 == 0){
                    cout << it->first << " " << it->second << endl;
                }
            }
            cout << endl;
//          vector<pair<int, int>> v;
//          for(auto it : mp){
//              if(it.second % 2 == 0){
//                  cout << it.first << " " << it.second << endl;
//                  v.push_back(it);
//              }
//          }
//          cout << endl;
//          for(int i = v.size() - 1; i >= 0; i--){
//              cout << v[i].first << " " << v[i].second << endl;
//          }
            break;
        }
        // ------------------------------------
        case 6:{
            map<int, int> mp3;
//          6
//          -1 -1 0 0 -1 2

            int n3;
            cin >> n3;
            for(int i = 0; i < n3; i++){
                int x;
                cin >> x;
//              mp3[x]++;
                if(mp3.count(x) == 0){
                    mp3.insert({x, 1});
                }
                else{
                    mp3[x]++;
                }
            }
            cout << endl;
            for(auto it : mp3){
                cout << it.first << " " << it.second << endl;
            }
            cout << endl;
            break;
        }
        // ------------------------------------
        case 7:{
            map<int, int> mp2;
            int n2;
            cin >> n2;
            for(int i = 0; i < n2; i++){
                int x;
                cin >> x;
                mp2[x] = 1;
            }
            cout << mp2.size() << endl;
            break;
        }
        // ------------------------------------
        case 8:{
            map<string, string> mp1;  //
            mp1["SV 001"] = "Nguyen Tan Chang";
            mp1["SV 005"] = "Le Thi Hong Nhung";
            cout << mp1["SV 001"] << endl;
            break;
        }
        // ------------------------------------
        case 9:{
            multiset<int> se3;
            int n1;
            cin >> n1;
            for(int i = 0; i < n1; i++){
                int x;
                cin >> x;
                se3.insert(x);
            }
            int q;
            cin >> q;
            while(q--){
                int tt, x;
                cin >> tt >> x;

                if(tt == 1){
                    se3.insert(x);
                }
                else if(tt == 2){
                    auto it = se3.find(x);
                    if(it != se3.end()){
                        se3.erase(it); // *it
                    }
                }
                else if(tt == 3){
                    if(se3.count(x) != 0)
                        cout << "YES\n";
                    else
                        cout << "NO\n";
                }
            }
            break;
        }
        // ------------------------------------
        case 10:{
            multiset<int> se1 = {
                3, 1, 2, 1, 2, 3, 1, 4, 5, 6
            };
            for(int x : se1){
                cout << x << " "; // 1, 1, 1, 2, 2, 3, 3, 4, 5, 6
            }
            cout << endl;
            set<int> se2 = {
                3, 1, 2, 1, 2, 3, 1, 4, 5, 6
            };
            for(int x : se2){
                cout << x << " "; // 1, 2, 3, 4, 5, 6
            }
            cout << endl;
            break;
        }
        // ------------------------------------
        case 11:{
//          5
//          1 2
//          1 2
//          2 2
//          2 1
//          2 1
            set<pair<int, int>> se;
            int n;
            cin >> n;
            for(int i = 0; i < n; i++){
                int x, y;
                cin >> x >> y;
                pair<int, int> tmp = {x, y};
                se.insert(tmp);
            }
            cout << se.size() << endl;
            break;
        }
        // ------------------------------------
        case 12:{
            int m;
            cin >> m;
            pair<int, int> a[m];
            for(int i = 0; i < m; i++){
                cin >> a[i].first >> a[i].second;
            }
            for(int i = 0; i < m; i++){
                cout << a[i].first << " "
                     << a[i].second << endl;
            }
            break;
        }
        // ------------------------------------
        case 13:{
            freopen("Untitled2-input3.txt", "r", stdin);
            int n; cin >> n;
            map<string, string> mp;
            cin.ignore();
            for(int i = 0; i < n; i++){
                string id, name;
                getline(cin, id);
                getline(cin, name);
                mp[id] = name;
            }
            int q; cin >> q;
            cin.ignore();
            while(q--){
                string id; getline(cin, id);
                if(mp.count(id) == 0){
                    cout << "NOT FOUND\n";
                }
                else{
                    cout << mp[id] << endl;
                }
            }
            break;
        }
        // ------------------------------------
        case 14:{
            break;
        }
        // ------------------------------------
        default:
            cout << "Khong co bai nay!";
    }
    return 0;
}