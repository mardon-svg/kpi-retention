import React from 'react';
import { Card, CardHeader, CardBody } from './ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from './ui/Table';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';

function Termination({ drivers, up, can }) {
  const active = drivers.filter(d => d.status !== 'Terminated' || !d.termDate);
  const leavers = drivers.filter(d => d.status === 'Terminated' && d.termDate);

  return (
    <div className="section space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Active</h2>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <Thead>
              <Tr>
                <Th>Driver</Th>
                <Th>Recruiter</Th>
                <Th>Start</Th>
                <Th>Status</Th>
                <Th>Terminate Date</Th>
                <Th>Reason</Th>
              </Tr>
            </Thead>
            <Tbody>
              {active.map(d => {
                const needsDate = (d.status === 'Terminated' && !d.termDate);
                return (
                  <Tr key={d.id}>
                    <Td>{d.name || '—'}</Td>
                    <Td>{d.recruiter || '—'}</Td>
                    <Td>{d.startDate || '—'}</Td>
                    <Td>
                      <Select
                        value={d.status}
                        onChange={(e) => {
                          if (!can.setTermination) return;
                          const status = e.target.value;
                          up(
                            d.id,
                            status === 'Active'
                              ? { status, termDate: '', termReason: '' }
                              : { status }
                          );
                        }}
                        className="w-32"
                        disabled={!can.setTermination}
                      >
                        <option>Active</option>
                        <option>Terminated</option>
                      </Select>
                    </Td>
                    <Td>
                      <Input
                        type="date"
                        value={d.termDate}
                        onChange={(e) => {
                          if (!can.setTermination) return;
                          const value = e.target.value;
                          up(d.id, { termDate: value });
                        }}
                        className={`w-40 ${needsDate ? 'border-danger' : ''}`}
                        disabled={!can.setTermination || d.status !== 'Terminated'}
                      />
                    </Td>
                    <Td>
                      <Input
                        value={d.termReason}
                        onChange={(e) => {
                          if (!can.setTermination) return;
                          up(d.id, { termReason: e.target.value });
                        }}
                        placeholder="Reason"
                        className="w-60"
                        disabled={!can.setTermination || d.status !== 'Terminated'}
                      />
                    </Td>
                  </Tr>
                );
              })}
              {!active.length && (
                <Tr>
                  <Td colSpan={6} className="py-4 text-gray-400">No active drivers.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Leavers</h3>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <Thead>
              <Tr>
                <Th>Driver</Th>
                <Th>Recruiter</Th>
                <Th>Start</Th>
                <Th>Term Date</Th>
                <Th>Reason</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {leavers.map(d => (
                <Tr key={d.id}>
                  <Td>{d.name}</Td>
                  <Td>{d.recruiter || '—'}</Td>
                  <Td>{d.startDate || '—'}</Td>
                  <Td>{d.termDate || '—'}</Td>
                  <Td>
                    <Input
                      value={d.termReason}
                      onChange={(e) => {
                        if (!can.setTermination) return;
                        up(d.id, { termReason: e.target.value });
                      }}
                      placeholder="Reason"
                      className="w-60"
                      disabled={!can.setTermination}
                    />
                  </Td>
                  <Td>
                    <Button
                      onClick={() => {
                        if (!can.setTermination) return;
                        up(d.id, { status: 'Active', termDate: '', termReason: '' });
                      }}
                      variant="ghost"
                      disabled={!can.setTermination}
                    >
                      Reactivate
                    </Button>
                  </Td>
                </Tr>
              ))}
              {!leavers.length && (
                <Tr>
                  <Td colSpan={6} className="py-4 text-gray-400">No leavers yet.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

export default Termination;
