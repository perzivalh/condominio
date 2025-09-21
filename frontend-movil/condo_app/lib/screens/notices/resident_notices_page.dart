import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/notice_model.dart';
import '../../models/resident_profile.dart';
import '../../services/notice_service.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';

class ResidentNoticesPage extends StatefulWidget {
  const ResidentNoticesPage({
    super.key,
    required this.session,
  });

  final ResidentSession session;

  @override
  State<ResidentNoticesPage> createState() => _ResidentNoticesPageState();
}

class _ResidentNoticesPageState extends State<ResidentNoticesPage> {
  final NoticeService _service = NoticeService();

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
      setState(() {
        _notices = data;
      });
    } catch (error) {
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
              'Cuando el administrador publique un aviso aparecerá aquí.',
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

    return ListView.separated(
      physics: physics,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      itemCount: _notices.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final notice = _notices[index];
        return _NoticeCard(
          notice: notice,
          formattedDate: _formatDate(notice.fechaVisible),
        );
      },
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) {
      return 'Pendiente de publicación';
    }
    final local = date.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    final year = local.year;
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$day/$month/$year · $hour:$minute';
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({
    required this.notice,
    required this.formattedDate,
  });

  final ResidentNotice notice;
  final String formattedDate;

  @override
  Widget build(BuildContext context) {
    final autor = notice.autorNombre;

    return NeumorphicSurface(
      borderRadius: const BorderRadius.all(Radius.circular(24)),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            notice.titulo.isNotEmpty ? notice.titulo : 'Aviso sin título',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryText,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            formattedDate,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.secondaryText,
            ),
          ),
          if (autor != null && autor.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Publicado por $autor',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.secondaryText,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Text(
            notice.contenido,
            style: const TextStyle(
              fontSize: 15,
              height: 1.4,
              fontWeight: FontWeight.w500,
              color: AppColors.primaryText,
            ),
          ),
        ],
      ),
    );
  }
}
