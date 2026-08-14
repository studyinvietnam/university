from graphviz import Digraph

# Tạo sơ đồ dạng flowchart
flow = Digraph(format="png")
flow.attr(rankdir="TB", size="8,10")

# Vẽ các bước trong chương trình
flow.node("start", "Bắt đầu chương trình", shape="oval")

flow.node("nhap_n", "Nhập n (số hệ số)", shape="parallelogram")
flow.node("nhap_he_so", "Nhập mảng hệ số heSo[]", shape="parallelogram")

flow.node("goi_ham", "Gọi hàm inDaThuc(heSo, n)", shape="rectangle")

# Các bước trong hàm inDaThuc
flow.node("lap_i", "Duyệt i = 0 đến n-1", shape="diamond")
flow.node("kiem_tra_0", "heSo[i] == 0 ?", shape="diamond")
flow.node("tiep_tuc", "continue (bỏ qua hạng tử)", shape="rectangle")

flow.node("dau", "Xử lý dấu + hoặc -\n(dựa vào laHienThiDauTien và heSo[i])", shape="rectangle")

flow.node("bac_0", "Nếu i == 0 → in hệ số", shape="rectangle")
flow.node("bac_1", "Nếu i == 1 → in heSo[i] * x", shape="rectangle")
flow.node("bac_khac", "Nếu i > 1 → in heSo[i] * x^i", shape="rectangle")

flow.node("ket_thuc_in", "Kết thúc in đa thức", shape="oval")

# Vẽ các liên kết
flow.edge("start", "nhap_n")
flow.edge("nhap_n", "nhap_he_so")
flow.edge("nhap_he_so", "goi_ham")
flow.edge("goi_ham", "lap_i")

flow.edge("lap_i", "kiem_tra_0")
flow.edge("kiem_tra_0", "tiep_tuc", label="Đúng")
flow.edge("kiem_tra_0", "dau", label="Sai")

flow.edge("dau", "bac_0", label="i == 0")
flow.edge("dau", "bac_1", label="i == 1")
flow.edge("dau", "bac_khac", label="i > 1")

flow.edge("bac_0", "lap_i")
flow.edge("bac_1", "lap_i")
flow.edge("bac_khac", "lap_i")

flow.edge("lap_i", "ket_thuc_in", label="i > n-1")

# Xuất file
flow.render("so_do_luong_da_thuc", view=True)

print("Đã tạo sơ đồ: so_do_luong_da_thuc.png")
