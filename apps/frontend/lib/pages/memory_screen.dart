import 'dart:ui';
import 'package:flutter/material.dart';

class MemoryScreen extends StatefulWidget {
  const MemoryScreen({super.key});

  @override
  State<MemoryScreen> createState() => _MemoryScreenState();
}

class _MemoryScreenState extends State<MemoryScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final TextEditingController _search = TextEditingController();

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
      body: Stack(
        children: [
          // match the same vibe as home
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.2),
                radius: 1.2,
                colors: [
                  Color(0xFF12081A),
                  Color(0xFF0E0316),
                  Color(0xFF06020A),
                ],
                stops: [0.0, 0.55, 1.0],
              ),
            ),
          ),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: Column(
                      children: [
                        // Top bar
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
                          child: Row(
                            children: [
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(),
                                icon: Icon(Icons.arrow_back, color: Colors.white.withOpacity(0.85)),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                "MEMORY",
                                style: TextStyle(
                                  color: const Color(0xFF7A7F88).withOpacity(0.95),
                                  fontSize: 18,
                                  letterSpacing: 3,
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
                            labelColor: Colors.white.withOpacity(0.92),
                            unselectedLabelColor: Colors.white.withOpacity(0.55),
                            indicatorColor: const Color(0xFFF3387A).withOpacity(0.85),
                            tabs: const [
                              Tab(text: "Memories"),
                              Tab(text: "Chats"),
                              Tab(text: "Reflections"),
                            ],
                          ),
                        ),

                        const SizedBox(height: 10),

                        Expanded(
                          child: TabBarView(
                            controller: _tabs,
                            children: [
                              // Memories
                              Padding(
                                padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                child: Column(
                                  children: [
                                    _SearchBar(controller: _search, onChanged: (_) => setState(() {})),
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
                                                  style: TextStyle(color: Colors.white.withOpacity(0.55)),
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
                                  style: TextStyle(color: Colors.white.withOpacity(0.6)),
                                ),
                              ),

                              // Reflections placeholder
                              Center(
                                child: Text(
                                  "Reflections (coming soon)",
                                  style: TextStyle(color: Colors.white.withOpacity(0.6)),
                                ),
                              ),
                            ],
                          ),
                        )
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

  const _SearchBar({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,
            onChanged: onChanged,
            style: TextStyle(color: Colors.white.withOpacity(0.90)),
            decoration: InputDecoration(
              prefixIcon: Icon(Icons.search, color: Colors.white.withOpacity(0.55)),
              hintText: "Search memories…",
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.45)),
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
                color: Colors.white.withOpacity(0.55),
                letterSpacing: 2,
                fontSize: 12,
                fontWeight: FontWeight.w600,
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

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  item.text,
                  style: TextStyle(color: Colors.white.withOpacity(0.85), height: 1.2),
                ),
              ),
              IconButton(
                tooltip: item.pinned ? "Unpin" : "Pin",
                onPressed: () {
                  // Tonight: placeholder. Tomorrow: PATCH action=pin
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(item.pinned ? "Unpin (placeholder)" : "Pin (placeholder)")),
                  );
                },
                icon: Icon(
                  item.pinned ? Icons.push_pin : Icons.push_pin_outlined,
                  color: Colors.white.withOpacity(0.75),
                ),
              ),
              IconButton(
                tooltip: "Discard",
                onPressed: () {
                  // Tonight: placeholder. Tomorrow: PATCH action=discard
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Discard (placeholder)")),
                  );
                },
                icon: Icon(Icons.delete_outline, color: Colors.white.withOpacity(0.65)),
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
