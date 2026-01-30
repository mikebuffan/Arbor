import 'dart:ui';
import 'package:flutter/material.dart';

class MemoryScreen extends StatefulWidget {
  const MemoryScreen({super.key});

  @override
  State<MemoryScreen> createState() => _MemoryScreenState();
}

class _MemoryScreenState extends State<MemoryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final TextEditingController _search = TextEditingController();

  static const _bgAsset = "assets/bg/arbor_home_locked.png";

  // Locked tokens
  static const _bg = Color(0xFF0E0316);
  static const _textGrey = Color(0xFF7A7F88);
  static const _fuchsia = Color(0xFFF3387A);

  // Tonight: mock data. Tomorrow: wire to /api/memory/items
  final List<_MemItem> _items = [
    _MemItem(tier: "core", text: "Preferred address: Mike", pinned: true),
    _MemItem(tier: "core", text: "Legal name: Michael", pinned: true),
    _MemItem(tier: "normal", text: "Building Arbor app with memory system", pinned: false),
  ];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text.trim().toLowerCase();
    final filtered = query.isEmpty
        ? _items
        : _items.where((m) => m.text.toLowerCase().contains(query)).toList();

    final core = filtered.where((m) => m.tier == "core").toList();
    final normal = filtered.where((m) => m.tier == "normal").toList();
    final sensitive = filtered.where((m) => m.tier == "sensitive").toList();

    return Scaffold(
      backgroundColor: _bg,
      body: Stack(
        children: [
          // Background image (same as home)
          Positioned.fill(
            child: Image.asset(
              _bgAsset,
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (_, __, ___) => Container(color: _bg),
            ),
          ),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: Colors.white.withOpacity(0.06), width: 1),
                    ),
                    child: Column(
                      children: [
                        // Top bar (match mock minimalism)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
                          child: Row(
                            children: [
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(),
                                icon: Icon(Icons.arrow_back,
                                    color: _textGrey.withOpacity(0.90)),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                "MEMORY",
                                style: TextStyle(
                                  color: _textGrey.withOpacity(0.95),
                                  fontSize: 18,
                                  letterSpacing: 4,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const Spacer(),
                            ],
                          ),
                        ),

                        // Tabs
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: TabBar(
                            controller: _tabs,
                            labelColor: _textGrey.withOpacity(0.95),
                            unselectedLabelColor: _textGrey.withOpacity(0.55),
                            indicatorColor: _fuchsia.withOpacity(0.85),
                            indicatorWeight: 2.0,
                            tabs: const [
                              Tab(text: "Memories"),
                              Tab(text: "Chats"),
                              Tab(text: "Reflections"),
                            ],
                          ),
                        ),

                        const SizedBox(height: 12),

                        Expanded(
                          child: TabBarView(
                            controller: _tabs,
                            children: [
                              // Memories
                              Padding(
                                padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                child: Column(
                                  children: [
                                    _SearchBar(
                                      controller: _search,
                                      onChanged: (_) => setState(() {}),
                                    ),
                                    const SizedBox(height: 12),
                                    Expanded(
                                      child: ListView(
                                        children: [
                                          if (core.isNotEmpty) _TierBlock(title: "CORE", items: core),
                                          if (normal.isNotEmpty) _TierBlock(title: "NORMAL", items: normal),
                                          if (sensitive.isNotEmpty) _TierBlock(title: "SENSITIVE", items: sensitive),
                                          if (filtered.isEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 24),
                                              child: Center(
                                                child: Text(
                                                  "No memories match your search.",
                                                  style: TextStyle(color: _textGrey.withOpacity(0.60)),
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Chats placeholder
                              Center(
                                child: Text(
                                  "Chats (coming soon)",
                                  style: TextStyle(color: _textGrey.withOpacity(0.65)),
                                ),
                              ),

                              // Reflections placeholder
                              Center(
                                child: Text(
                                  "Reflections (coming soon)",
                                  style: TextStyle(color: _textGrey.withOpacity(0.65)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  static const _textGrey = Color(0xFF7A7F88);

  const _SearchBar({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.035),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,
            onChanged: onChanged,
            style: TextStyle(color: _textGrey.withOpacity(0.95)),
            decoration: InputDecoration(
              prefixIcon: Icon(Icons.search, color: _textGrey.withOpacity(0.55)),
              hintText: "Search memories…",
              hintStyle: TextStyle(color: _textGrey.withOpacity(0.45)),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
          ),
        ),
      ),
    );
  }
}

class _TierBlock extends StatelessWidget {
  final String title;
  final List<_MemItem> items;
  const _TierBlock({required this.title, required this.items});

  static const _textGrey = Color(0xFF7A7F88);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 6, bottom: 8),
            child: Text(
              title,
              style: TextStyle(
                color: _textGrey.withOpacity(0.60),
                letterSpacing: 3,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          for (final m in items) ...[
            _MemoryRow(item: m),
            const SizedBox(height: 10),
          ]
        ],
      ),
    );
  }
}

class _MemoryRow extends StatelessWidget {
  final _MemItem item;
  const _MemoryRow({required this.item});

  static const _textGrey = Color(0xFF7A7F88);
  static const _fuchsia = Color(0xFFF3387A);

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.035),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              // tiny tier dot (subtle, but gives a "designed" feel)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(right: 10),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: item.pinned
                      ? _fuchsia.withOpacity(0.80)
                      : _textGrey.withOpacity(0.55),
                ),
              ),

              Expanded(
                child: Text(
                  item.text,
                  style: TextStyle(
                    color: _textGrey.withOpacity(0.92),
                    height: 1.25,
                    fontSize: 14.5,
                  ),
                ),
              ),

              IconButton(
                tooltip: item.pinned ? "Unpin" : "Pin",
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(item.pinned ? "Unpin (placeholder)" : "Pin (placeholder)"),
                    ),
                  );
                },
                icon: Icon(
                  item.pinned ? Icons.push_pin : Icons.push_pin_outlined,
                  color: item.pinned
                      ? _fuchsia.withOpacity(0.85)
                      : _textGrey.withOpacity(0.70),
                ),
              ),

              IconButton(
                tooltip: "Discard",
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Discard (placeholder)")),
                  );
                },
                icon: Icon(Icons.delete_outline, color: _textGrey.withOpacity(0.65)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MemItem {
  final String tier; // core/normal/sensitive
  final String text;
  final bool pinned;
  _MemItem({required this.tier, required this.text, required this.pinned});
}
