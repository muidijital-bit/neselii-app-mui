import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppError,
  COMPANY_ROLE_HINTS,
  COMPANY_ROLE_LABELS,
  COMPANY_ROLES,
  LEAD_TOPIC_SHORT,
  canApprove,
  userMessage,
  type CompanyMember,
  type CompanyMembership,
  type CompanyRole,
} from '@/domain';
import { formatLeadDate } from '@/features/leads/presentation';
import { leadHref } from '@/features/leads/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSession } from '@/features/session/SessionProvider';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { OptionSheet } from '@/ui/OptionSheet';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Badge, Card, Chip, Divider } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useCompanyActions, useCompanyInvites, useCompanyMembers, useMembership, useMyInvites, usePendingCompanyLeads } from './useCompany';

const errorText = (error: unknown) => (error instanceof AppError && error.fieldErrors ? Object.values(error.fieldErrors)[0] : null) ?? userMessage(error);

/**
 * Kurumsal Hesap (madde 47, 51). Üye değilse: gelen davetler (kabul / reddet) ve şirket oluşturma. Üyeyse: şirket kartı ve rolüm; sahip ve onaylayan
 * için onay bekleyen talepler (Onayla / Reddet); üyeler (sahip rol değiştirir, çıkarır); sahip için davet formu ve bekleyen davetler; şirketten ayrılma.
 */
export function CompanyScreen() {
  const membership = useMembership();
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="company-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Kurumsal Hesap" testID="company-back" />
      {membership.isPending ? (
        <StateView loading />
      ) : membership.isError ? (
        <StateView title="Yüklenemedi" message={userMessage(membership.error)} actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void membership.refetch() }]} />
      ) : membership.data ? (
        <CompanyHome membership={membership.data} />
      ) : (
        <NoCompany />
      )}
    </KeyboardAvoidingView>
  );
}

function NoCompany() {
  const invites = useMyInvites(true);
  const actions = useCompanyActions();
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {(invites.data ?? []).map((invite) => (
        <Card key={invite.id} style={styles.card}>
          <View style={styles.row}>
            <Icon name="mail" size={20} color="success" />
            <Text variant="bodySemibold" style={styles.flex}>
              {invite.companyName} sizi davet etti
            </Text>
          </View>
          <Text variant="small">Rol: {COMPANY_ROLE_LABELS[invite.role]} · {COMPANY_ROLE_HINTS[invite.role]}</Text>
          <View style={styles.buttons}>
            <Button title="Reddet" variant="outline" style={styles.flex} onPress={() => actions.deleteInvite.mutate(invite.id)} />
            <Button title="Katıl" style={styles.flex} loading={actions.accept.isPending} onPress={() => actions.accept.mutate(invite.id)} testID="company-accept-invite" />
          </View>
        </Card>
      ))}
      <Card style={styles.card}>
        <Text variant="subheading">Şirketiniz için kurumsal hesap açın</Text>
        <Text variant="small">Çalışanlarınızı davet edin; talep edenlerin talepleri sizin onayınızdan sonra firmamıza iletilir.</Text>
        <TextField label="Şirket adı" value={name} onChangeText={setName} maxLength={120} testID="company-name" />
        <TextField label="Vergi numarası (isteğe bağlı)" value={taxNumber} onChangeText={setTaxNumber} keyboardType="number-pad" maxLength={20} testID="company-tax" />
        {actions.create.isError ? (
          <Text variant="small" color="danger">
            {errorText(actions.create.error)}
          </Text>
        ) : null}
        <Button
          title="Kurumsal Hesap Oluştur"
          icon="briefcase"
          loading={actions.create.isPending}
          onPress={() => actions.create.mutate({ name, taxNumber: taxNumber || null })}
          testID="company-create"
        />
      </Card>
      {actions.accept.isError ? (
        <Text variant="small" color="danger">
          {errorText(actions.accept.error)}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function CompanyHome({ membership }: { membership: CompanyMembership }) {
  const router = useRouter();
  const { session } = useSession();
  const owner = membership.role === 'owner';
  const approver = canApprove(membership.role);
  const members = useCompanyMembers(true);
  const pending = usePendingCompanyLeads(approver);
  const invites = useCompanyInvites(owner ? membership.company.id : null);
  const actions = useCompanyActions();
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CompanyRole>('requester');
  const [roleFor, setRoleFor] = useState<CompanyMember | null>(null);
  const failure = [actions.invite, actions.setRole, actions.remove, actions.decide, actions.deleteInvite].find((m) => m.isError)?.error;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.companyIcon}>
            <Icon name="briefcase" size={22} color="white" />
          </View>
          <View style={styles.flex}>
            <Text variant="subheading">{membership.company.name}</Text>
            {membership.company.taxNumber ? <Text variant="caption">Vergi no: {membership.company.taxNumber}</Text> : null}
          </View>
          <Badge label={COMPANY_ROLE_LABELS[membership.role]} tone="info" />
        </View>
        <Text variant="small">{COMPANY_ROLE_HINTS[membership.role]}.</Text>
      </Card>

      {approver ? (
        <Card style={styles.card}>
          <Text variant="subheading">Onay bekleyen talepler{pending.data?.length ? ` (${pending.data.length})` : ''}</Text>
          {pending.data?.length ? (
            pending.data.map((lead, i) => (
              <View key={lead.leadId}>
                {i > 0 ? <Divider /> : null}
                <Pressable accessibilityRole="button" onPress={() => router.push(leadHref(lead.leadId))} style={styles.pendingRow}>
                  <Text variant="bodySemibold">
                    {lead.requesterName} · {LEAD_TOPIC_SHORT[lead.topic]}
                  </Text>
                  <Text variant="small">{lead.listingTitle ?? 'Genel talep'}</Text>
                  <Text variant="caption">{formatLeadDate(lead.createdAt)}</Text>
                </Pressable>
                <View style={styles.buttons}>
                  <Button title="Reddet" variant="outline" style={styles.flex} disabled={actions.decide.isPending} onPress={() => actions.decide.mutate({ leadId: lead.leadId, approve: false })} />
                  <Button
                    title="Onayla"
                    style={styles.flex}
                    loading={actions.decide.isPending}
                    onPress={() => actions.decide.mutate({ leadId: lead.leadId, approve: true })}
                    testID={`company-approve-${lead.leadId}`}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text variant="small">Onay bekleyen talep yok.</Text>
          )}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text variant="subheading">Üyeler</Text>
        {(members.data ?? []).map((member, i) => {
          const me = member.userId === session?.user.id;
          return (
            <View key={member.userId}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.memberRow}>
                <View style={styles.flex}>
                  <Text variant="bodySemibold">
                    {member.fullName}
                    {me ? ' (siz)' : ''}
                  </Text>
                  <Text variant="caption">{member.email}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={!owner}
                  onPress={() => setRoleFor(member)}
                  style={styles.roleChip}
                  testID={`company-role-${member.userId}`}>
                  <Text variant="smallSemibold" color="heading">
                    {COMPANY_ROLE_LABELS[member.role]}
                  </Text>
                  {owner ? <Icon name="chevron-down" size={14} color="heading" /> : null}
                </Pressable>
                {owner && !me ? (
                  <Pressable
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${member.fullName} kişisini çıkar`}
                    onPress={() =>
                      Alert.alert('Üye çıkarılsın mı?', `${member.fullName} şirketten çıkarılacak.`, [
                        { text: 'Vazgeç', style: 'cancel' },
                        { text: 'Çıkar', style: 'destructive', onPress: () => actions.remove.mutate(member.userId) },
                      ])
                    }>
                    <Icon name="user-x" size={18} color="danger" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      {owner ? (
        <Card style={styles.card}>
          <Text variant="subheading">Üye davet et</Text>
          <TextField label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="company-invite-email" />
          <View style={styles.wrap}>
            {COMPANY_ROLES.map((role) => (
              <Chip key={role} label={COMPANY_ROLE_LABELS[role]} selected={inviteRole === role} onPress={() => setInviteRole(role)} />
            ))}
          </View>
          <Text variant="caption">{COMPANY_ROLE_HINTS[inviteRole]}. Davetli, bu e-postayla uygulamaya giriş yapıp Profil → Kurumsal Hesap’tan katılır.</Text>
          <Button
            title="Davet Gönder"
            icon="send"
            loading={actions.invite.isPending}
            onPress={() => actions.invite.mutate({ email, role: inviteRole }, { onSuccess: () => setEmail('') })}
            testID="company-invite"
          />
          {(invites.data ?? []).map((invite) => (
            <View key={invite.id} style={styles.memberRow}>
              <Icon name="clock" size={16} color="textSecondary" />
              <Text variant="small" style={styles.flex}>
                {invite.email} · {COMPANY_ROLE_LABELS[invite.role]} · bekliyor
              </Text>
              <Pressable hitSlop={8} accessibilityRole="button" onPress={() => actions.deleteInvite.mutate(invite.id)}>
                <Text variant="smallSemibold" color="danger">
                  İptal
                </Text>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : (
        <Button
          title="Şirketten Ayrıl"
          variant="outline"
          onPress={() =>
            Alert.alert('Şirketten ayrılınsın mı?', `${membership.company.name} kurumsal hesabından ayrılacaksınız.`, [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Ayrıl', style: 'destructive', onPress: () => session && actions.remove.mutate(session.user.id) },
            ])
          }
        />
      )}

      {failure ? (
        <Text variant="small" color="danger" accessibilityRole="alert">
          {errorText(failure)}
        </Text>
      ) : null}

      <OptionSheet
        visible={roleFor !== null}
        title={roleFor ? `${roleFor.fullName} için rol` : 'Rol'}
        options={COMPANY_ROLES.map((role) => ({ value: role, label: `${COMPANY_ROLE_LABELS[role]} · ${COMPANY_ROLE_HINTS[role]}` }))}
        selected={roleFor?.role ?? null}
        onSelect={(value) => {
          if (roleFor && value && value !== roleFor.role) actions.setRole.mutate({ userId: roleFor.userId, role: value });
        }}
        onClose={() => setRoleFor(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  card: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  companyIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  pendingRow: { paddingTop: Spacing.two, gap: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceHighlight,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
