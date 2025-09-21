import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/notice_model.dart';
import '../../models/resident_profile.dart';
import '../../services/announcement_service.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';

class ResidentAnnouncementsPage extends StatefulWidget {
  const ResidentAnnouncementsPage({super.key, required this.session});

  final ResidentSession session;

  @override
  State<ResidentAnnouncementsPage> createState() => _ResidentAnnouncementsPageState();
}

class _ResidentAnnouncementsPageState extends State<ResidentAnnouncementsPage> {
  final AnnouncementService _service = AnnouncementService();
  final Set<String> _marking = <String>{};

  List<ResidentNotice> _notices = <ResidentNotice>[];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadNotices();
  }

  Future<void> _loadNotices() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await _service.fetchNotices();
      if (!mounted) return;
      setState(() {
        _notices = data;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _markAsRead(ResidentNotice notice) async {
    if (notice.leido || _marking.contains(notice.id)) {
      return;
    }

    setState(() {
      _marking.add(notice.id);
    });

    try {
      await _service.markAsRead(notice.id);
      if (!mounted) return;
      setState(() {
        _notices = _notices
            .map(
              (item) => item.id == notice.id
                  ? item.copyWith(leidoEn: DateTime.now())
                  : item,
            )
            .toList();
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo marcar como leído: $error')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _marking.remove(notice.id);
        });
      } else {
        _marking.remove(notice.id);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.session.profile;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Avisos',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryText,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          profile.fullName.isNotEmpty
                              ? profile.fullName
                              : profile.displayCode,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.secondaryText,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primaryText,
                onRefresh: _loadNotices,
                child: _buildContent(),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: ResidentBottomNavBar(
        selectedIndex: 1,
        onChanged: (index) {
          if (index != 1) {
            Navigator.of(context).pop();
          }
        },
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading && _notices.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.only(top: 80),
          child: CircularProgressIndicator(),
        ),
      );
    }

    final physics = const AlwaysScrollableScrollPhysics();

    if (_notices.isEmpty) {
      return ListView(
        physics: physics,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                _error!,
                style: const TextStyle(
                  color: Colors.redAccent,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const NeumorphicSurface(
            borderRadius: BorderRadius.all(Radius.circular(24)),
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Text(
              'No tienes avisos nuevos. Aquí aparecerán los comunicados del administrador.',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.secondaryText,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      );
    }

    final children = <Widget>[];

    if (_error != null) {
      children.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 12, left: 4, right: 4),
          child: Text(
            _error!,
            style: const TextStyle(
              color: Colors.redAccent,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
    }

    for (final notice in _notices) {
      children.add(
        _NoticeCard(
          notice: notice,
          onMarkAsRead: _markAsRead,
          isProcessing: _marking.contains(notice.id),
        ),
      );
      children.add(const SizedBox(height: 16));
    }

    if (children.isNotEmpty) {
      children.removeLast();
    }

    return ListView(
      physics: physics,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      children: children,
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({
    required this.notice,
    required this.onMarkAsRead,
    required this.isProcessing,
  });

  final ResidentNotice notice;
  final ValueChanged<ResidentNotice> onMarkAsRead;
  final bool isProcessing;

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return NeumorphicSurface(
      borderRadius: BorderRadius.circular(24),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            notice.titulo,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryText,
                            ),
                          ),
                        ),
                        if (!notice.leido)
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Color(0xFFE53935),
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Publicado el ${_formatDate(notice.publicadoEn)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.secondaryText,
                      ),
                    ),
                    if (notice.autor != null && notice.autor!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Por ${notice.autor}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.secondaryText,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            notice.contenido,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: AppColors.primaryText,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          if (notice.leido)
            Text(
              'Leído el ${_formatDate(notice.leidoEn)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.secondaryText,
                fontWeight: FontWeight.w600,
              ),
            )
          else
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(
                onPressed: isProcessing ? null : () => onMarkAsRead(notice),
                child: Text(isProcessing ? 'Marcando...' : 'Marcar como leído'),
              ),
            ),
        ],
      ),
    );
  }
}
