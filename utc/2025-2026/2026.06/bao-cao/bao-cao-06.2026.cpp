#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <direct.h>
#include <ctype.h>

#define MAX_SV 1000

// Cau truc luu thong tin sinh vien
typedef struct {
    char mssv[15];
    char ho_ten[50];
    char ngay_sinh[12];
    char lop[30];
    char email[50];
    char nganh[50];
    char khoa[10];
    char tinh_trang[20];
    float chuyen_can;
    float qua_trinh;
    float thi;
    float gpa;
} SinhVien;

// Cau truc Node cho danh sach lien ket
typedef struct Node {
    SinhVien data;
    struct Node *next;
} Node;

/* ===== HIEN THI DANH SACH LIEN KET ===== */
void hienThiDanhSach(SinhVien ds[], int n) {
    printf("\n===== DANH SACH SINH VIEN =====\n");
    for (int i = 0; i < n; i++) {
        printf("\n--- SV %d ---\n", i + 1);
        printf("MSSV: %s\n", ds[i].mssv);
        printf("Ho ten: %s\n", ds[i].ho_ten);
        printf("Ngay sinh: %s\n", ds[i].ngay_sinh);
        printf("Lop: %s\n", ds[i].lop);
        printf("Email: %s\n", ds[i].email);
        printf("Nganh: %s\n", ds[i].nganh);
        printf("Khoa: %s\n", ds[i].khoa);
        printf("Tinh trang: %s\n", ds[i].tinh_trang);
        printf("Chuyen can: %.2f\n", ds[i].chuyen_can);
        printf("Qua trinh: %.2f\n", ds[i].qua_trinh);
        printf("Thi: %.2f\n", ds[i].thi);
        printf("GPA: %.2f\n", ds[i].gpa);
    }
}

/* Ham doc du lieu sinh vien */
int taiDuLieuGitHub(SinhVien sv[]) {
    char command[512];
    sprintf(
        command,
        "curl -s https://raw.githubusercontent.com/chunglop0781/tai-lieu-hoc-tap/main/C_library-main/2026/ky-thuat-lap-trinh-utc/bao-cao/student_no_diacritics.txt"
    );
    FILE *file = popen(command, "r");

    if (file == NULL) {
        printf("Khong the ket noi GitHub!\n");
        return 0;
    }
    int tongSV = 0;
    int count = 0;
    /* Doc dong dau tien chua tong so sinh vien */
    fscanf(file, "%d\n", &tongSV);
    printf("Tong sinh vien trong file: %d\n", tongSV);
    while (
        count < MAX_SV &&
        fscanf(
            file,
            " %14[^|]|%49[^|]|%11[^|]|%29[^|]|%49[^|]|%49[^|]|%9[^|]|%19[^|]|%f|%f|%f|%f",
            sv[count].mssv,
            sv[count].ho_ten,
            sv[count].ngay_sinh,
            sv[count].lop,
            sv[count].email,
            sv[count].nganh,
            sv[count].khoa,
            sv[count].tinh_trang,
            &sv[count].chuyen_can,
            &sv[count].qua_trinh,
            &sv[count].thi,
            &sv[count].gpa
        ) == 12
    ) {
        count++;
    }
    pclose(file);
    printf("Da doc duoc %d sinh vien\n", count);
    return count;
}
void luuFileLocal(SinhVien sv[], int count) {
    _mkdir("D:\\bai tap dh");
    _mkdir("D:\\bai tap dh\\2026.06");
    _mkdir("D:\\bai tap dh\\2026.06\\bao-cao");
    FILE *fout = fopen(
        "D:\\bai tap dh\\2026.06\\bao-cao\\student.txt",
        "w"
    );

    if (fout == NULL) {
        printf("Khong the tao file!\n");
        return;
    }

    for (int i = 0; i < count; i++) {
        fprintf(fout,
            "%s|%s|%s|%s|%s|%s|%s|%s|%.2f|%.2f|%.2f|%.2f\n",
            sv[i].mssv,
            sv[i].ho_ten,
            sv[i].ngay_sinh,
            sv[i].lop,
            sv[i].email,
            sv[i].nganh,
            sv[i].khoa,
            sv[i].tinh_trang,
            sv[i].chuyen_can,
            sv[i].qua_trinh,
            sv[i].thi,
            sv[i].gpa
        );
    }
    fclose(fout);
    printf("Luu file vao may thanh cong!\n");
}

/* Ham hien thi 1 SV */
void hienThiKiemTra(SinhVien sv[], int n) {
    if (n == 0) return;
    int idx = (n >= 3) ? 2 : n - 1;
    printf("\n===== SINH VIEN KIEM TRA =====\n");
    printf("MSSV: %s\n", sv[idx].mssv);
    printf("Ho ten: %s\n", sv[idx].ho_ten);
    printf("Ngay sinh: %s\n", sv[idx].ngay_sinh);
    printf("Lop: %s\n", sv[idx].lop);
    printf("Email: %s\n", sv[idx].email);
    printf("Nganh: %s\n", sv[idx].nganh);
    printf("Khoa: %s\n", sv[idx].khoa);
    printf("Tinh trang: %s\n", sv[idx].tinh_trang);
    printf("Chuyen can: %.2f\n", sv[idx].chuyen_can);
    printf("Qua trinh: %.2f\n", sv[idx].qua_trinh);
    printf("Thi: %.2f\n", sv[idx].thi);
    printf("GPA: %.2f\n", sv[idx].gpa);
}

/* ===== NODE ===== */
Node* makeNode(SinhVien sv) {
    Node *p = (Node*)malloc(sizeof(Node));
    p->data = sv;
    p->next = NULL;
    return p;
}

//themCuoiSinhVien
void pushBack(Node **head, SinhVien sv) {
    Node *p = makeNode(sv);
    if (*head == NULL) {
        *head = p;
        return;
    }
    Node *tmp = *head;
    while (tmp->next != NULL) tmp = tmp->next;
    tmp->next = p;
}

void nhapThongTin(SinhVien *sv) {
    printf("--- Nhap thong tin sinh vien moi ---\n");
    printf("MSSV: ");
    scanf("%14s", sv->mssv);
    while (getchar() != '\n');
    printf("Ho ten: ");
    fgets(sv->ho_ten, 50, stdin);
    sv->ho_ten[strcspn(sv->ho_ten, "\n")] = 0;
    printf("Ngay sinh: ");
    scanf("%11s", sv->ngay_sinh);
    while (getchar() != '\n');
    printf("Lop: ");
    fgets(sv->lop, 30, stdin);
    sv->lop[strcspn(sv->lop, "\n")] = 0;
    printf("Email: ");
    scanf("%49s", sv->email);
    while (getchar() != '\n');
    printf("Nganh: ");
    fgets(sv->nganh, 50, stdin);
    sv->nganh[strcspn(sv->nganh, "\n")] = 0;
    printf("Khoa: ");
    scanf("%9s", sv->khoa);
    while (getchar() != '\n');
    printf("Tinh trang: ");
    fgets(sv->tinh_trang, 20, stdin);
    sv->tinh_trang[strcspn(sv->tinh_trang, "\n")] = 0;
    printf("Chuyen can: ");
    scanf("%f", &sv->chuyen_can);
    printf("Qua trinh: ");
    scanf("%f", &sv->qua_trinh);
    printf("Thi: ");
    scanf("%f", &sv->thi);
    sv->gpa = sv->chuyen_can * 0.1f
            + sv->qua_trinh * 0.3f
            + sv->thi * 0.6f;
    printf("GPA: %.2f\n", sv->gpa);
    printf("\n=> Da them sinh vien co MSSV %s thanh cong!\n", sv->mssv);
    while (getchar() != '\n');
}

/* ===== TIM KIEM SINH VIEN THEO TEN VA MSSV ===== */
void toLowerCase(char str[]) {
    for (int i = 0; str[i] != '\0'; i++) {
        str[i] = tolower(str[i]);
    }
}
void timKiemSinhVien(SinhVien ds[], int n) {
    int luaChon, found = 0;
    printf("\n===== TIM KIEM SINH VIEN =====\n");
    printf("1. Tim theo ho ten\n");
    printf("2. Tim theo MSSV\n");
    printf("Chon: ");
    scanf("%d", &luaChon);
    getchar();
    if (luaChon == 1) {
    	char tenCanTim[50];
    	printf("Nhap ho ten can tim: ");
    	fgets(tenCanTim, sizeof(tenCanTim), stdin);
    	tenCanTim[strcspn(tenCanTim, "\n")] = '\0';
    	toLowerCase(tenCanTim);
    	for (int i = 0; i < n; i++) {
        	char hoTenTam[50];
        	strcpy(hoTenTam, ds[i].ho_ten);
        	toLowerCase(hoTenTam);
        	if (strstr(hoTenTam, tenCanTim) != NULL) {
            	printf("\n===== THONG TIN SINH VIEN =====\n");
            	printf("MSSV: %s\n", ds[i].mssv);
            	printf("Ho ten: %s\n", ds[i].ho_ten);
            	printf("Ngay sinh: %s\n", ds[i].ngay_sinh);
            	printf("Lop: %s\n", ds[i].lop);
            	printf("Email: %s\n", ds[i].email);
            	printf("Nganh: %s\n", ds[i].nganh);
            	printf("Khoa: %s\n", ds[i].khoa);
            	printf("Tinh trang: %s\n", ds[i].tinh_trang);
            	printf("Chuyen can: %.2f\n", ds[i].chuyen_can);
            	printf("Qua trinh: %.2f\n", ds[i].qua_trinh);
            	printf("Thi: %.2f\n", ds[i].thi);
            	printf("GPA: %.2f\n", ds[i].gpa);
            	found = 1;
        	}
    	}
	}
    else if (luaChon == 2) {
        char mssvCanTim[15];
        printf("Nhap MSSV can tim: ");
        scanf("%14s", mssvCanTim);
        for (int i = 0; i < n; i++) {
            if (strcmp(ds[i].mssv, mssvCanTim) == 0) {
                printf("\n===== THONG TIN SINH VIEN =====\n");
                printf("MSSV: %s\n", ds[i].mssv);
                printf("Ho ten: %s\n", ds[i].ho_ten);
                printf("Ngay sinh: %s\n", ds[i].ngay_sinh);
                printf("Lop: %s\n", ds[i].lop);
                printf("Email: %s\n", ds[i].email);
                printf("Nganh: %s\n", ds[i].nganh);
                printf("Khoa: %s\n", ds[i].khoa);
                printf("Tinh trang: %s\n", ds[i].tinh_trang);
                printf("Chuyen can: %.2f\n", ds[i].chuyen_can);
                printf("Qua trinh: %.2f\n", ds[i].qua_trinh);
                printf("Thi: %.2f\n", ds[i].thi);
                printf("GPA: %.2f\n", ds[i].gpa);
                found = 1;
                break;
            }
        }
    }
    else {
        printf("Lua chon khong hop le!\n");
        return;
    }
    if (!found) {
        printf("Khong tim thay sinh vien!\n");
    }
}

/* ===== CAP NHAT THONG TIN SINH VIEN ===== */
void capNhatSinhVien(SinhVien ds[], int n) {
    printf("\n===== TIM KIEM SINH VIEN CAN CAP NHAT =====\n");
    timKiemSinhVien(ds, n);
    printf("\nSau khi xem ket qua tim kiem, nhap MSSV can cap nhat.\n");
    char maTim[15];
    printf("Nhap MSSV cua sinh vien can cap nhat: ");
    scanf("%14s", maTim);
    while (getchar() != '\n');
    int found = 0;
    for (int i = 0; i < n; i++) {
        if (strcmp(ds[i].mssv, maTim) == 0) {
            found = 1;
            printf("\n--- Tim thay sinh vien: %s ---\n", ds[i].ho_ten);
            printf("Nhap thong tin moi (nhap le tung truong):\n");
            printf("1. Cap nhat Ho ten moi: ");
            fgets(ds[i].ho_ten, 50, stdin);
            ds[i].ho_ten[strcspn(ds[i].ho_ten, "\n")] = 0;
            printf("2. Cap nhat Ngay sinh moi: ");
            scanf("%11s", ds[i].ngay_sinh);
            while (getchar() != '\n');
            printf("3. Cap nhat Lop moi: ");
            fgets(ds[i].lop, 30, stdin);
            ds[i].lop[strcspn(ds[i].lop, "\n")] = 0;
            printf("4. Cap nhat Email moi: ");
            scanf("%49s", ds[i].email);
            while (getchar() != '\n');
            printf("5. Cap nhat Nganh moi: ");
            fgets(ds[i].nganh, 50, stdin);
            ds[i].nganh[strcspn(ds[i].nganh, "\n")] = 0;
            printf("6. Cap nhat Khoa moi: ");
            scanf("%9s", ds[i].khoa);
            printf("7. Cap nhat Tinh trang moi: ");
				while (getchar() != '\n');
				fgets(ds[i].tinh_trang, 20, stdin);
				ds[i].tinh_trang[strcspn(ds[i].tinh_trang, "\n")] = 0;
            printf("8. Cap nhat diem Chuyen can: ");
            scanf("%f", &ds[i].chuyen_can);
            printf("9. Cap nhat diem Qua trinh: ");
            scanf("%f", &ds[i].qua_trinh);
            printf("10. Cap nhat diem Thi: ");
            scanf("%f", &ds[i].thi);
            ds[i].gpa = ds[i].chuyen_can * 0.1f
                      + ds[i].qua_trinh * 0.3f
                      + ds[i].thi * 0.6f;
            printf("\n=> Da cap nhat thong tin thanh cong cho MSSV %s!\n", maTim);
            break;
        }
    }
    if (!found) {
        printf("Khong tim thay sinh vien co MSSV: %s\n", maTim);
    }
}

/* ===== XOA THONG TIN SINH VIEN ===== */
void xoaSinhVien(SinhVien ds[], int *n) {
    printf("\n===== TIM KIEM SINH VIEN CAN XOA =====\n");
    timKiemSinhVien(ds, *n);
    printf("\nSau khi xem ket qua tim kiem, nhap MSSV can xoa.\n");
    char maXoa[15];
    printf("\nNhap MSSV cua sinh vien muon xoa: ");
    scanf("%14s", maXoa);
    int found = 0;
    for (int i = 0; i < *n; i++) {
        if (strcmp(ds[i].mssv, maXoa) == 0) {
            found = 1;
            printf("Da tim thay sinh vien: %s\n", ds[i].ho_ten);
            printf("Dang thuc hien xoa...\n");
            for (int j = i; j < (*n) - 1; j++) {
                ds[j] = ds[j + 1];
            }
            (*n)--;
            printf("=> Da xoa sinh vien co MSSV %s thanh cong!\n", maXoa);
            return;
        }
    }
    printf("Khong tim thay sinh vien co MSSV %s de xoa.\n", maXoa);
}

/* ===== LOC THEO LOP HOAC NGANH ===== */
void locTheoLopNganh(SinhVien ds[], int n, char *tuKhoa) {
    FILE *fout = fopen(
        "D:\\bai tap dh\\2026.06\\bao-cao\\danh_sach_lop_nganh.txt",
        "w"
    );
    if (fout == NULL) {
        printf("Loi: Khong the tao file loc lop/nganh!\n");
        return;
    }
    fprintf(fout, "DANH SACH SINH VIEN LOP/NGANH: %s\n", tuKhoa);
    for (int i = 0; i < n; i++) {
        if (strcmp(ds[i].lop, tuKhoa) == 0 ||
            strcmp(ds[i].nganh, tuKhoa) == 0) {
            fprintf(fout,
                "%s|%s|%s|%s|GPA: %.2f\n",
                ds[i].mssv,
                ds[i].ho_ten,
                ds[i].lop,
                ds[i].nganh,
                ds[i].gpa
            );
        }
    }
    fclose(fout);
    printf("Da trich xuat danh sach lop/nganh vao file!\n");
}

/* ===== LOC SINH VIEN GPA < 2.0 ===== */
void locCanhBaoGPA(SinhVien ds[], int n) {
    FILE *fout = fopen(
        "D:\\bai tap dh\\2026.06\\bao-cao\\canh_bao_gpa.txt",
        "w"
    );
    if (fout == NULL) {
        printf("Loi: Khong the tao file canh bao GPA!\n");
        return;
    }
    fprintf(
        fout,
        "DANH SACH SINH VIEN CO NGUY CO CANH CAO (GPA < 2.0)\n"
    );
    for (int i = 0; i < n; i++) {
        if (ds[i].gpa < 2.0) {
            fprintf(
                fout,
                "MSSV: %s | Ten: %s | GPA: %.2f\n",
                ds[i].mssv,
                ds[i].ho_ten,
                ds[i].gpa
            );
        }
    }
    fclose(fout);
    printf("Da trich xuat danh sach canh bao GPA vao file!\n");
}

/* ===== LOC SINH VIEN VANG MAT > 20%% ===== */
void locVangMat(SinhVien ds[], int n) {
    FILE *fout = fopen(
        "D:\\bai tap dh\\2026.06\\bao-cao\\nguy_co_nghi_hoc.txt",
        "w"
    );
    if (fout == NULL) {
        printf("Loi: Khong the tao file loc vang mat!\n");
        return;
    }
    fprintf(
        fout,
        "DANH SACH SINH VIEN VANG MAT QUA 20%% SO BUOI\n"
    );
    for (int i = 0; i < n; i++) {
        if (ds[i].chuyen_can < 8.0) {
            fprintf(
                fout,
                "MSSV: %s | Ten: %s | Diem Chuyen Can: %.2f\n",
                ds[i].mssv,
                ds[i].ho_ten,
                ds[i].chuyen_can
            );
        }
    }
    fclose(fout);
    printf("Da trich xuat danh sach vang mat vao file!\n");
}

/* Ham Sap xep (Sort) */
// ============================================================
Node* buildList(SinhVien sv[], int count) {
    Node *head = NULL, *tail = NULL;
    for (int i = 0; i < count; i++) {
        Node *newNode = (Node*)malloc(sizeof(Node));
        if (!newNode) continue;
        newNode->data = sv[i];
        newNode->next = NULL;
        if (head == NULL) {
            head = tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;
        }
    }
    return head;
}
// ============================================================
// CASE 9 — Sap xep
// ============================================================
void sapXepSinhVien(Node *head, int tieuChi, int order) {
    if (head == NULL) {
        printf("Danh sach rong!\n");
        return;
    }
    for (Node *i = head; i->next != NULL; i = i->next) {
        Node *targetNode = i;
        for (Node *j = i->next; j != NULL; j = j->next) {
            int condition = 0;
            if (tieuChi == 1)
                condition = strcmp(j->data.ho_ten, targetNode->data.ho_ten);
            else if (tieuChi == 2)
                condition = strcmp(j->data.mssv, targetNode->data.mssv);
            else if (tieuChi == 3) {
                if (j->data.gpa > targetNode->data.gpa)
                    condition = 1;
                else if (j->data.gpa < targetNode->data.gpa)
                    condition = -1;
                else
                    condition = 0;
            }

            if ((order == 1 && condition < 0) ||
                (order == 2 && condition > 0)) {
                targetNode = j;
            }
        }
        SinhVien temp = i->data;
        i->data = targetNode->data;
        targetNode->data = temp;
    }
    FILE *fout = fopen(
        "D:\\bai tap dh\\2026.06\\bao-cao\\sap-xep.txt",
        "w"
    );
    if (fout == NULL) {
        printf("Khong mo duoc file sap-xep.txt\n");
        return;
    }
    fprintf(fout,
            "=============================================================\n");
    fprintf(fout,
            "| %-10s | %-30s | %-5s |\n",
            "MSSV", "HO TEN", "GPA");
    fprintf(fout,
            "=============================================================\n");
    for (Node *p = head; p != NULL; p = p->next) {
        fprintf(fout,
                "| %-10s | %-30s | %5.2f |\n",
                p->data.mssv,
                p->data.ho_ten,
                p->data.gpa);
    }
    fprintf(fout,
            "=============================================================\n");
    fclose(fout);
    printf("Da sap xep danh sach thanh cong.\n");
    printf("Da luu ket qua vao file sap-xep.txt\n");
}
// ============================================================
// CASE 10 — Thong ke theo lop
// ============================================================
void thongKeTheoLop(Node *head, char *tenLop) {
    if (head == NULL) {
        printf("Danh sach trong! Hay load du lieu truoc.\n");
        return;
    }
    int   count   = 0;
    float tongGPA = 0;
    for (Node *t = head; t != NULL; t = t->next) {
        char lop[50];
        strncpy(lop, t->data.lop, 49);
        lop[49] = '\0';
        lop[strcspn(lop, "\r\n")] = '\0';
        if (strcmp(lop, tenLop) == 0) {
            count++;
            tongGPA += t->data.gpa;
        }
    }
    if (count > 0) {
        printf("\n===== THONG KE LOP =====\n");
        printf("Lop           : %s\n", tenLop);
        printf("So sinh vien  : %d\n", count);
        printf("GPA trung binh: %.2f\n", tongGPA / count);
    } else {
        printf("Khong tim thay lop: \"%s\"\n", tenLop);
        if (head != NULL)
            printf("(Mau: lop dau tien trong DS = \"%s\")\n", head->data.lop);
    }
}
// ============================================================
// CASE 11 — Thu khoa & diem thap nhat
// ============================================================
void timThuKhoaVaKem(Node *head) {
    if (head == NULL) { printf("Danh sach trong!\n"); return; }
    Node *maxSV = head, *minSV = head;
    for (Node *t = head->next; t != NULL; t = t->next) {
        if (t->data.gpa > maxSV->data.gpa) maxSV = t;
        if (t->data.gpa < minSV->data.gpa) minSV = t;
    }
    printf("\n===== THU KHOA & DIEM THAP NHAT =====\n");
    printf("Thu khoa       : %-30s MSSV: %s  GPA: %.2f\n",
           maxSV->data.ho_ten, maxSV->data.mssv, maxSV->data.gpa);
    printf("Diem thap nhat : %-30s MSSV: %s  GPA: %.2f\n",
           minSV->data.ho_ten, minSV->data.mssv, minSV->data.gpa);
}
// ============================================================
// CASE 12 — Ty le xep loai
// ============================================================
void tinhTyLeXepLoai(Node *head) {
    if (head == NULL) { 
        printf("Danh sach trong!\n"); 
        return; 
    }
    int tong = 0, gioi = 0, kha = 0, trungBinh = 0, yeu = 0;
    for (Node *t = head; t != NULL; t = t->next) {
        tong++;
        if      (t->data.gpa >= 3.2) gioi++;
        else if (t->data.gpa >= 2.5) kha++;
        else if (t->data.gpa >= 2.0) trungBinh++;
        else                         yeu++;
    }
    printf("\n===== TY LE XEP LOAI THANG DIEM 4 (Tong: %d SV) =====\n", tong);
    printf("Gioi/Xuat sac (>= 3.2) : %5.2f%%  (%d SV)\n", (float)gioi      / tong * 100, gioi);
    printf("Kha           (2.5 - 3.1) : %5.2f%%  (%d SV)\n", (float)kha       / tong * 100, kha);
    printf("Trung binh    (2.0 - 2.4) : %5.2f%%  (%d SV)\n", (float)trungBinh / tong * 100, trungBinh);
    printf("Yeu/Kem       (< 2.0)     : %5.2f%%  (%d SV)\n", (float)yeu       / tong * 100, yeu);
}


/* ===== MAIN ===== */
int main() {
    SinhVien ds[MAX_SV];
    Node *head = NULL;
    int n = 0;
    int luaChon;
    FILE *f = fopen("D:\\bai tap dh\\2026.06\\bao-cao\\student.txt", "r");
    if (f != NULL) {
        while (fscanf(f,
            " %14[^|]|%49[^|]|%11[^|]|%29[^|]|%49[^|]|%49[^|]|%9[^|]|%19[^|]|%f|%f|%f|%f",
            ds[n].mssv, ds[n].ho_ten, ds[n].ngay_sinh, ds[n].lop,
            ds[n].email, ds[n].nganh, ds[n].khoa, ds[n].tinh_trang,
            &ds[n].chuyen_can, &ds[n].qua_trinh, &ds[n].thi, &ds[n].gpa
        ) == 12) {
            ds[n].lop[strcspn(ds[n].lop, "\r")] = '\0';
            n++;
        }
        fclose(f);
        printf("Da doc %d sinh vien tu file local!\n", n);
    }
    for (int i = 0; i < n; i++) {
        pushBack(&head, ds[i]);
    }
    hienThiKiemTra(ds, n);
    while (1) {
        printf("\n------ MENU QUAN LY SINH VIEN ------\n");
        printf("1. Nhap them sinh vien moi\n");
        printf("2. Hien thi danh sach\n");
        printf("3. Tim kiem sinh vien\n");
        printf("4. Cap nhat thong tin sinh vien\n");
        printf("5. Xoa sinh vien\n");
        printf("6. Loc theo Lop/Nganh\n");
        printf("7. Loc sinh vien GPA < 2.0\n");
        printf("8. Loc sinh vien vang mat > 20%%\n");
        printf("9. Sap xep sinh vien\n");
        printf("10. Thong ke theo lop\n");
        printf("11. Tim thu khoa va sinh vien diem thap nhat\n");
        printf("12. Tinh ty le xep loai\n");
        printf("13. Update du lieu tu GitHub\n");
        printf("0. Thoat\n");
        printf("Chon: ");
        scanf("%d", &luaChon);
        if (luaChon == 1) {
            SinhVien svMoi;
            nhapThongTin(&svMoi);
            pushBack(&head, svMoi);
            ds[n++] = svMoi;
        } else if (luaChon == 2) {
            hienThiDanhSach(ds, n);
        } else if (luaChon == 3) {
            timKiemSinhVien(ds, n);
        } else if (luaChon == 4) {
            capNhatSinhVien(ds, n);
        } else if (luaChon == 5) {
            xoaSinhVien(ds, &n);
        } else if (luaChon == 6) {
            char tuKhoa[50];
            printf("Nhap ten lop hoac nganh: ");
            getchar();
            fgets(tuKhoa, sizeof(tuKhoa), stdin);
            tuKhoa[strcspn(tuKhoa, "\n")] = 0;
            locTheoLopNganh(ds, n, tuKhoa);
        } else if (luaChon == 7) {
            locCanhBaoGPA(ds, n);
        } else if (luaChon == 8) {
            locVangMat(ds, n);
        } else if (luaChon == 9) {
            int tieuChi, order;
            printf("\n===== SAP XEP DANH SACH =====\n");
            printf("1. Theo Ten\n2. Theo MSSV\n3. Theo GPA\n");
            printf("Nhap tieu chi: ");
            scanf("%d", &tieuChi);
            printf("1. Tang dan\n2. Giam dan\n");
            printf("Nhap thu tu: ");
            scanf("%d", &order);
            sapXepSinhVien(head, tieuChi, order);
        } else if (luaChon == 10) {
            char tenLop[50];
            printf("Nhap ten lop can thong ke: ");
            getchar();
            fgets(tenLop, sizeof(tenLop), stdin);
            tenLop[strcspn(tenLop, "\n")] = '\0';
            thongKeTheoLop(head, tenLop);
        } else if (luaChon == 11) {
            timThuKhoaVaKem(head);
        } else if (luaChon == 12) {
            tinhTyLeXepLoai(head);
        } else if (luaChon == 13) {
            n = taiDuLieuGitHub(ds);
            luuFileLocal(ds, n);
            head = NULL;
            for (int i = 0; i < n; i++) {
                pushBack(&head, ds[i]);
            }
        } else if (luaChon == 0) {
            FILE *fout = fopen("D:\\bai tap dh\\2026.06\\bao-cao\\student.txt", "w");
            if (fout != NULL) {
                for (int i = 0; i < n; i++) {
                    fprintf(fout,
                        "%s|%s|%s|%s|%s|%s|%s|%s|%.2f|%.2f|%.2f|%.2f\n",
                        ds[i].mssv, ds[i].ho_ten, ds[i].ngay_sinh, ds[i].lop,
                        ds[i].email, ds[i].nganh, ds[i].khoa, ds[i].tinh_trang,
                        ds[i].chuyen_can, ds[i].qua_trinh, ds[i].thi, ds[i].gpa
                    );
                }
                fclose(fout);
            }
            break;
        }
    }
    return 0;
}